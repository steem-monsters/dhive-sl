/**
 * @file HiveEngine API helper
 * @license BSD-3-Clause-No-Military-License
 */

import fs from 'fs';
import { log, tryParse } from '../utils';
import SSC from 'sscjs';

export interface HiveEngineOptions {
    url: string;
    chainId: string;
    saveState: (lastBlock: number) => any;
    loadState: () => any;
    stateFile: string;
    onOp: any;
}

export type HiveEngineParameters = Partial<HiveEngineOptions>;

export class HiveEngineAPI {
    // TODO: sscjs no typings
    private ssc: any = null;
    private lastBlock = 0;
    private options: HiveEngineOptions;

    constructor(parameters: HiveEngineParameters = {}) {
        this.options = {
            url: 'https://api.hive-engine.com/rpc',
            chainId: 'ssc-mainnet-hive',
            saveState: (lastBlock: number) => this.saveState(lastBlock),
            loadState: () => this.loadState(),
            stateFile: 'state_he.json',
            onOp: null,
            ...parameters,
        };
        this.ssc = new SSC(this.options.url);
    }

    async stream(onOp) {
        this.options.onOp = onOp;
        let lastBlock = 0;

        // Load saved state (last block read)
        if (this.options.loadState) lastBlock = await this.options.loadState();

        // Start streaming blocks
        if (lastBlock > 0) this.ssc.streamFromTo(lastBlock + 1, null, (err, block) => this.processBlock(err, block));
        else this.ssc.stream((err, block) => this.processBlock(err, block));
    }

    async processBlock(err, block) {
        if (err) log('Error processing block: ' + err);

        if (!block) return;

        log('Processing block [' + block.blockNumber + ']...', block.blockNumber % 1000 == 0 ? 1 : 4);

        try {
            for (let i = 0; i < block.transactions.length; i++)
                await this.processTransaction(
                    block.transactions[i],
                    block.blockNumber,
                    new Date(block.timestamp + 'Z'),
                    block.refSteemBlockNumber,
                    block.refSteemBlockId,
                    block.prevRefSteemBlockId,
                );
        } catch (e: any) {
            log('Error processing block: ' + block.blockNumber + ', Error: ' + e.message);
        }

        if (this.options.saveState) {
            this.lastBlock = block.blockNumber;
            this.options.saveState(block.blockNumber);
        }
    }

    async processTransaction(tx, ssc_block_num, ssc_block_time, block_num, block_id, prev_block_id) {
        const logs = tryParse(tx.logs);

        // The transaction was unsuccessful
        if (!logs || logs.errors || !logs.events || logs.events.length == 0) return;

        if (this.options.onOp) {
            try {
                await this.options.onOp(tx, ssc_block_num, ssc_block_time, block_num, block_id, prev_block_id, tryParse(tx.payload), logs.events);
            } catch (err) {
                log(`Error processing Hive Engine transaction [${tx.transactionId}]: ${err}`, 1, 'Red');
            }
        }
    }

    async loadState() {
        // Check if state has been saved to disk, in which case load it
        if (fs.existsSync(this.options.stateFile)) {
            const state = JSON.parse(fs.readFileSync(String(this.options.stateFile)).toString());
            log('Restored saved state: ' + JSON.stringify(state));
            return state.lastBlock;
        }
    }

    saveState(lastBlock) {
        // Save the last block read to disk
        fs.writeFile(String(this.options.stateFile), JSON.stringify({ lastBlock }), function (e: any) {
            if (e) log(e);
        });
    }

    getLastBlock() {
        return this.lastBlock;
    }
}
