/**
 * @file HiveEngine API helper
 * @license BSD-3-Clause-No-Military-License
 */

import fs from 'fs';
import { log, tryParse } from '../utils';
import {
    Block as EngineBlock,
    Client as EngineClient,
    Operation as EngineOperation,
    OperationJson as EngineOperationJson,
    TokensTransferOperation,
    Transaction as EngineTransaction,
} from 'splinterlands-hive-engine';
import { Client } from '../client';
import { PrivateKey } from '../chain/keys/keys';

export interface EngineOptions {
    url: string;
    chainId: string;
    saveState: (lastBlock: number) => any;
    loadState: () => any;
    stateFile: string;
    onOp: any;
}

export type EngineParameters = Partial<EngineOptions>;

export class EngineApi {
    public client: EngineClient;
    private lastBlock: number;
    private options: EngineOptions;

    constructor(private hiveClient: Client, parameters: EngineParameters = {}) {
        this.options = {
            url: 'https://api.hive-engine.com/rpc',
            chainId: 'ssc-mainnet-hive',
            saveState: (lastBlock: number) => this.saveState(lastBlock),
            loadState: () => this.loadState(),
            stateFile: 'state_he.json',
            onOp: null,
            ...parameters,
        };
        this.lastBlock = 0;
        this.client = new EngineClient(this.options.url);
    }

    public async broadcast(op: EngineOperation, account: string, privateKey: string | PrivateKey, activeAuth?: boolean) {
        const json: EngineOperationJson = { contractName: op[0], contractAction: op[1], contractPayload: op[2] };
        return this.hiveClient.broadcast.customJsonQueue({ id: this.options.chainId, account, activeAuth, json }, privateKey);
    }

    public async transfer(data: TokensTransferOperation[2], from: string, privateKey: string | PrivateKey) {
        const op: TokensTransferOperation = ['tokens', 'transfer', data];
        return this.broadcast(op as EngineOperation, from, privateKey);
    }

    public async stream(onOp) {
        this.options.onOp = onOp;
        let lastBlock = this.lastBlock;

        // Load saved state (last block read)
        if (this.options.loadState) lastBlock = await this.options.loadState();

        // Start streaming blocks
        if (lastBlock > 0) this.client.blockchain.streamFromTo(lastBlock + 1, (err, block) => this.processBlock(err, block));
        else this.client.blockchain.stream((err, block) => this.processBlock(err, block));
    }

    private async processBlock(err, block: EngineBlock) {
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

    private async processTransaction(transaction: EngineTransaction, engineBlockNum: number, engineBlockTime: Date, blockNum: number, blockId: string, prevBlockId: string) {
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
}
