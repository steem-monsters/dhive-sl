import { ClientFetch } from '../../clientFetch';
import { HiveEngineRequest } from '../types';
import { LogLevel, log, tryParse } from '../../utils/utils';

export interface HiveEngineBlockchainOptions {
    saveState: (lastBlock: number) => any;
    loadState: () => any;
    fs?: any;
    stateFile: string;
    onOp: any;
}

export interface HiveEngineBlock {
    _id: number;
    blockNumber: number;
    refHiveBlockNumber: number;
    refHiveBlockId: string;
    prevRefHiveBlockId: string;
    previousHash: string;
    previousDatabaseHash: string;
    timestamp: string;
    transactions: HiveEngineTransaction[];
    virtualTransactions: any[]; // TODO
    hash: string;
    databaseHash: string;
    merkleRoot: string;
    round: number | null;
    roundHash: string;
    witness: string;
    signingKey: string;
    roundSignature: string;
}

export interface HiveEngineTransaction {
    blockNumber: number;
    refHiveBlockNumber: number;
    transactionId: string;
    sender: string;
    contract: string;
    action: string;
    payload: string;
    executedCodeHash: string;
    hash: string;
    databaseHash: string;
    logs: string;
}

export interface HiveEngineBlockchainStatus {
    lastBlockNumber: number;
    lastBlockRefHiveBlockNumber: number;
    lastHash: string;
    lastParsedHiveBlockNumber: number;
    SSCnodeVersion: string;
    domain: string;
    chainId: string;
    lightNode: boolean;
}

export class HiveEngineBlockchainApi {
    private lastBlock: number;
    private readonly options: HiveEngineBlockchainOptions;

    constructor(private readonly fetch: ClientFetch, options: Partial<HiveEngineBlockchainOptions>) {
        this.lastBlock = 0;
        this.options = {
            saveState: (lastBlock: number) => this.saveState(lastBlock),
            loadState: () => this.loadState(),
            stateFile: 'state_he.json',
            onOp: null,
            fs: null,
            ...options,
        };
    }

    private call<T>(request: HiveEngineRequest) {
        return this.fetch.call<T>('blockchain', request);
    }

    /**
     * retrieve the specified transaction info of the sidechain
     * @param txid transaction id
     * @param callback callback called if passed
     * @returns returns a promise if no callback passed
     */
    public getStatus() {
        const request: HiveEngineRequest = {
            method: 'getStatus',
        };

        return this.call<HiveEngineBlockchainStatus>(request);
    }

    /**
     * retrieve the specified block info of the sidechain
     * @param blockNumber block number
     * @param callback callback called if passed
     * @returns returns a promise if no callback passed
     */
    public getBlock(blockNumber: number) {
        const request: HiveEngineRequest = {
            method: 'getBlockInfo',
            params: {
                blockNumber,
            },
        };
        return this.call<HiveEngineBlock>(request);
    }

    /**
     * retrieve the latest block info of the sidechain
     * @param callback callback called if passed
     * @returns returns a promise if no callback passed
     */
    public getLatestBlock() {
        const request: HiveEngineRequest = {
            method: 'getLatestBlockInfo',
        };

        return this.call<HiveEngineBlock>(request);
    }

    /**
     * retrieve the specified transaction info of the sidechain
     * @param txid transaction id
     * @param callback callback called if passed
     * @returns returns a promise if no callback passed
     */
    public getTransaction(txid: string) {
        const request: HiveEngineRequest = {
            method: 'getTransactionInfo',
            params: {
                txid,
            },
        };

        return this.call<HiveEngineTransaction>(request);
    }

    /**
     * stream part of the sidechain
     * @param startBlock the first block to retrieve
     * @param endBlock if passed the stream will stop after the block is retrieved
     * @param callback callback called everytime a block is retrieved
     * @param pollingTime polling time, default 1 sec
     */
    public async streamFromTo(startBlock: number, callback: any, endBlock = -1, pollingTime = 1000) {
        try {
            const res = await this.getBlock(startBlock);
            let nextBlock = startBlock;
            if (res !== null) {
                callback(null, res);
                nextBlock += 1;
            }

            if (endBlock === -1 || (endBlock && nextBlock <= endBlock)) {
                setTimeout(() => {
                    this.streamFromTo(nextBlock, endBlock, callback, pollingTime);
                }, pollingTime);
            }
        } catch (err) {
            callback(err, null);
            setTimeout(() => {
                this.streamFromTo(startBlock, endBlock, callback, pollingTime);
            }, pollingTime);
        }
    }

    public async stream(onOp) {
        this.options.onOp = onOp;
        let lastBlock = this.lastBlock;

        // Load saved state (last block read)
        if (this.options.loadState) lastBlock = await this.options.loadState();

        // Start streaming blocks
        if (lastBlock > 0) {
            this.streamFromTo(lastBlock + 1, (err, block) => this.processBlock(err, block));
        } else {
            const { blockNumber } = await this.getLatestBlock();

            this.streamFromTo(blockNumber, (err, block) => this.processBlock(err, block));
        }
    }

    private async processBlock(err, block: HiveEngineBlock) {
        if (err) log('Error processing block: ' + err);

        if (!block) return;

        log('Processing block [' + block.blockNumber + ']...', block.blockNumber % 1000 == 0 ? LogLevel.Warning : LogLevel.Debug);

        try {
            for (let i = 0; i < block.transactions.length; i++)
                await this.processTransaction(
                    block.transactions[i],
                    block.blockNumber,
                    new Date(block.timestamp + 'Z'),
                    block.refHiveBlockNumber,
                    block.refHiveBlockId,
                    block.prevRefHiveBlockId,
                );
        } catch (e: any) {
            log('Error processing block: ' + block.blockNumber + ', Error: ' + e.message, LogLevel.Error);
        }

        if (this.options.saveState) {
            this.lastBlock = block.blockNumber;
            this.options.saveState(block.blockNumber);
        }
    }

    private async processTransaction(transaction: HiveEngineTransaction, engineBlockNum: number, engineBlockTime: Date, blockNum: number, blockId: string, prevBlockId: string) {
        const logs = tryParse(transaction.logs);

        // The transaction was unsuccessful
        if (!logs || logs.errors || !logs.events || logs.events.length == 0) return;

        if (this.options.onOp) {
            try {
                await this.options.onOp(transaction, engineBlockNum, engineBlockTime, blockNum, blockId, prevBlockId, tryParse(transaction.payload), logs.events);
            } catch (err) {
                log(`Error processing Hive Engine transaction [${transaction.transactionId}]: ${err}`, LogLevel.Error, 'Red');
            }
        }
    }

    private async loadState() {
        if (!this.options.fs) throw Error('Missing fs parameter');
        // Check if state has been saved to disk, in which case load it
        if (this.options.fs.existsSync(this.options.stateFile)) {
            const state = JSON.parse(this.options.fs.readFileSync(String(this.options.stateFile)).toString());
            log('Restored saved state: ' + JSON.stringify(state), LogLevel.Info);
            return state.lastBlock;
        }
    }

    private saveState(lastBlock) {
        if (!this.options.fs) throw Error('Missing fs parameter');
        // Save the last block read to disk
        this.options.fs.writeFile(String(this.options.stateFile), JSON.stringify({ lastBlock }), function (e: any) {
            if (e) log(e, LogLevel.Error);
        });
    }
}
