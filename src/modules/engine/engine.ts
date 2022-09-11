import fs from 'fs';
import { HiveEngineBlock, HiveEngineBlockchainApi, HiveEngineTransaction } from './blockchain';
import { HiveEngineContractsApi } from './contracts';
import { HiveEngineTokensContractsApi } from './contracts/tokens';
import { HiveEngineOperation, HiveEngineOperationJson, HiveEngineRequest, HiveEngineTokensTransferOperation } from '../../chain/engine';
import { PrivateKey } from '../../chain/keys/keys';
import { Client } from '../../client';
import { log, tryParse } from '../../utils';
import { HiveEngineMarketPoolsContractsApi } from './contracts/marketpools';
import { HiveEngineMarketContractsApi } from './contracts/market';
import { HiveEngineDistributionContractsApi } from './contracts/distribution';

export interface HiveEngineOptions {
    nodes: string | string[];
    chainId: string;
    saveState: (lastBlock: number) => any;
    loadState: () => any;
    stateFile: string;
    onOp: any;
}

export type HiveEngineParameters = Partial<HiveEngineOptions>;

export class HiveEngineClient {
    public static defaultNodes = ['https://api.hive-engine.com/rpc', 'https://herpc.dtools.dev'];
    // Modules
    public readonly blockchain: HiveEngineBlockchainApi;
    public readonly contracts: HiveEngineContractsApi;

    // Submodules
    public readonly tokens: HiveEngineTokensContractsApi;
    public readonly market: HiveEngineMarketContractsApi;
    public readonly marketpools: HiveEngineMarketPoolsContractsApi;
    public readonly distribution: HiveEngineDistributionContractsApi;

    private options: HiveEngineOptions;
    private id: number;
    private lastBlock: number;

    constructor(private hiveClient: Client, parameters: HiveEngineParameters = {}) {
        this.options = {
            nodes: ['https://api.hive-engine.com/rpc', 'https://herpc.dtools.dev'],
            chainId: 'ssc-mainnet-hive',
            saveState: (lastBlock: number) => this.saveState(lastBlock),
            loadState: () => this.loadState(),
            stateFile: 'state_he.json',
            onOp: null,
            ...parameters,
        };
        this.lastBlock = 0;

        this.id = 1;

        // Modules
        this.blockchain = new HiveEngineBlockchainApi(this);
        this.contracts = new HiveEngineContractsApi(this);

        // Contracts
        this.tokens = new HiveEngineTokensContractsApi(this.contracts);
        this.market = new HiveEngineMarketContractsApi(this.contracts);
        this.marketpools = new HiveEngineMarketPoolsContractsApi(this.contracts);
        this.distribution = new HiveEngineDistributionContractsApi(this.contracts);
    }

    public async broadcast(op: HiveEngineOperation, account: string, privateKey: string | PrivateKey | string[] | PrivateKey[], role: 'active' | 'posting' = 'posting') {
        const json: HiveEngineOperationJson = { contractName: op[0], contractAction: op[1], contractPayload: op[2] };
        return this.hiveClient.broadcast.customJsonQueue({ id: this.options.chainId, account, role, json }, privateKey);
    }

    public async transfer(data: HiveEngineTokensTransferOperation[2], from: string, privateKey: string | PrivateKey | string[] | PrivateKey[]) {
        const op: HiveEngineTokensTransferOperation = ['tokens', 'transfer', data];
        return this.broadcast(op as HiveEngineOperation, from, privateKey);
    }

    public async stream(onOp) {
        this.options.onOp = onOp;
        let lastBlock = this.lastBlock;

        // Load saved state (last block read)
        if (this.options.loadState) lastBlock = await this.options.loadState();

        // Start streaming blocks
        if (lastBlock > 0) this.blockchain.streamFromTo(lastBlock + 1, (err, block) => this.processBlock(err, block));
        else this.blockchain.stream((err, block) => this.processBlock(err, block));
    }

    private async processBlock(err, block: HiveEngineBlock) {
        if (err) log('Error processing block: ' + err);

        if (!block) return;

        log('Processing block [' + block.blockNumber + ']...', block.blockNumber % 1000 == 0 ? 1 : 4);

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
            log('Error processing block: ' + block.blockNumber + ', Error: ' + e.message);
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
                log(`Error processing Hive Engine transaction [${transaction.transactionId}]: ${err}`, 1, 'Red');
            }
        }
    }

    private async loadState() {
        // Check if state has been saved to disk, in which case load it
        if (fs.existsSync(this.options.stateFile)) {
            const state = JSON.parse(fs.readFileSync(String(this.options.stateFile)).toString());
            log('Restored saved state: ' + JSON.stringify(state));
            return state.lastBlock;
        }
    }

    private saveState(lastBlock) {
        // Save the last block read to disk
        fs.writeFile(String(this.options.stateFile), JSON.stringify({ lastBlock }), function (e: any) {
            if (e) log(e);
        });
    }

    /**
     * send a JSON RPC request
     * @param endpoint endpoint
     * @param request request
     * @param callback callback called after the request is sent if passed (a promise is returned otherwise)
     */
    public send<T>(endpoint: string, request: HiveEngineRequest, callback: any) {
        if (callback) {
            this.sendWithCallback(endpoint, request, callback);
        }

        return this.sendWithPromise<T>(endpoint, request);
    }

    /**
     * send a JSON RPC request, return a promise
     * @param endpoint endpoint
     * @param request request
     */
    private sendWithPromise<T>(endpoint: string, request: HiveEngineRequest): Promise<T> {
        return this.hiveClient.fetch.engine.call(endpoint, request);
    }

    /**
     * send a JSON RPC request with callback
     * @param endpoint endpoint
     * @param request request
     * @param callback callback called after the request is sent
     */
    private async sendWithCallback(endpoint: string, request: HiveEngineRequest, callback: any) {
        try {
            const result = await this.hiveClient.fetch.engine.call(endpoint, request);
            callback(null, result);
        } catch (error) {
            callback(error, null);
        }
    }
}
