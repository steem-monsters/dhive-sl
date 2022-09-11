import { HiveEngineRequest } from '../../chain/engine';
import { HiveEngineClient } from './engine';

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
    constructor(private readonly client: HiveEngineClient) {}

    private call<T>(request: HiveEngineRequest, callback: any = null) {
        return this.client.send<T>('blockchain', request, callback);
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

    /**
     * stream the sidechain (starting from the latest block produced)
     * @param callback callback called everytime a block is retrieved
     * @param pollingTime polling time, default 1 sec
     */
    public async stream(callback: any, pollingTime = 1000) {
        const { blockNumber } = await this.getLatestBlock();

        this.streamFromTo(blockNumber, null, callback, pollingTime);
    }
}
