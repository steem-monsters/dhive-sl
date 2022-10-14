/**
 * @file Database API helpers.
 * @author Johan Nordberg <code@johan-nordberg.com>
 * @license BSD-3-Clause-No-Military-License
 */

import { Client } from '../client';
import { iteratorStream, log, sleep, timeout } from '../utils';
import fs from 'fs';
import { SignedBlock } from '../chain/block';

export type BlockchainMode = 'irreversible' | 'latest';

export interface BlockchainStreamOptions {
    /**
     * Start block number, inclusive. If omitted generation will start from current block height.
     */
    from?: number;
    /**
     * End block number, inclusive. If omitted stream will continue indefinitely.
     */
    to?: number;
    /**
     * Streaming mode, if set to `Latest` may include blocks that are not applied to the final chain.
     * Defaults to `Irreversible`.
     */
    mode?: BlockchainMode;
}

export interface SLBlockchainStreamOptions {
    mode: BlockchainMode;
    blocksBehindHead: number;
    saveState: (state: { lastBlock: number; lastVopBlock: number }) => any;
    loadState: () => any;
    stateFile: string; // 'state.json';
    onBlock: any;
    onOp: any;
    onVirtualOp: any;
    onBehindBlocks: any;
    replayBatchSize: any;
}

export type SLBlockchainStreamParameters = Partial<SLBlockchainStreamOptions>;

export class Blockchain {
    private streamOptions: SLBlockchainStreamOptions;
    private lastBlock: number;
    private lastVopBlock: number;

    constructor(readonly client: Client, streamParameters: SLBlockchainStreamParameters = {}) {
        this.streamOptions = {
            mode: 'latest',
            blocksBehindHead: 0,
            saveState: (state) => this.saveState(state),
            loadState: () => this.loadState(),
            stateFile: 'state.json',
            onBlock: null,
            onOp: null,
            onVirtualOp: null,
            onBehindBlocks: null,
            replayBatchSize: null,
            ...streamParameters,
        };
        this.lastBlock = 0;
        this.lastVopBlock = 0;
    }

    /**
     * Get latest block number.
     */
    public async getCurrentBlockNum(mode: BlockchainMode = 'irreversible') {
        const props = await this.client.database.getDynamicGlobalProperties();
        switch (mode) {
            case 'irreversible':
                return props.last_irreversible_block_num;
            case 'latest':
                return props.head_block_number;
        }
    }

    /**
     * Get latest block header.
     */
    public async getCurrentBlockHeader(mode?: BlockchainMode) {
        return this.client.database.getBlockHeader(await this.getCurrentBlockNum(mode));
    }

    /**
     * Get latest block.
     */
    public async getCurrentBlock(mode?: BlockchainMode) {
        return this.client.database.getBlock(await this.getCurrentBlockNum(mode));
    }

    public async getNextBlock(mode?: BlockchainMode) {
        try {
            const result = await this.client.database.getDynamicGlobalProperties();

            if (!result) {
                setTimeout(() => this.getNextBlock(), 1000);
                return;
            }

            const currentBlockNum = mode === 'irreversible' ? result.last_irreversible_block_num : result.head_block_number - this.streamOptions.blocksBehindHead;

            if (!this.lastBlock || isNaN(this.lastBlock)) this.lastBlock = currentBlockNum - 1;

            // We are 20+ blocks behind!
            if (currentBlockNum >= this.lastBlock + 20) {
                log('Streaming is ' + (currentBlockNum - this.lastBlock) + ' blocks behind!', 1, 'Red');

                if (this.streamOptions.onBehindBlocks) this.streamOptions.onBehindBlocks(currentBlockNum - this.lastBlock);
            }

            while (currentBlockNum > this.lastBlock) {
                if (this.streamOptions.replayBatchSize && this.streamOptions.replayBatchSize > 1) {
                    const firstUpcomingBlock = this.lastBlock + 1;
                    const promises: any[] = [];
                    for (let i = 0; i < this.streamOptions.replayBatchSize; i++) {
                        const consecutiveBlock = firstUpcomingBlock + i;
                        if (consecutiveBlock > currentBlockNum) {
                            break;
                        }
                        promises.push(this.client.database.getBlock(consecutiveBlock));
                    }
                    const blocks: SignedBlock[] = await Promise.all(promises);
                    for (const block of blocks) {
                        if (!block || !block.transactions) {
                            log('Error loading block batch that contains [' + currentBlockNum + ']', 4);
                            await timeout(1000);
                            return;
                        }
                        await this.processBlockHelper(block, this.lastBlock + 1, currentBlockNum);
                        if (this.streamOptions.onVirtualOp) {
                            await this.getVirtualOps(result.last_irreversible_block_num);
                        }
                    }
                } else {
                    // If we have a new block, process it
                    await this.processBlock(this.lastBlock + 1, currentBlockNum);
                    if (this.streamOptions.onVirtualOp) await this.getVirtualOps(result.last_irreversible_block_num);
                }
            }
        } catch (e: any) {
            log(`Error getting next block: ${e}`, 1, 'Red');
        }

        // Attempt to load the next block after a 1 second delay (or faster if we're behind and need to catch up)
        setTimeout(() => this.getNextBlock(), 1000);
    }

    async stream(options: SLBlockchainStreamParameters) {
        this.streamOptions = Object.assign(this.streamOptions, options);

        // Load saved state (last block read)
        if (this.streamOptions.loadState) {
            const state = await this.streamOptions.loadState();

            if (state) {
                this.lastBlock = state.lastBlock;
                this.lastVopBlock = state.lastVopBlock;
            }
        }

        // Start streaming blocks
        this.getNextBlock();
    }

    async getVirtualOps(last_irreversible_block_num) {
        if (last_irreversible_block_num <= this.lastVopBlock) return;

        const blockNum = !this.lastVopBlock || isNaN(this.lastVopBlock) ? last_irreversible_block_num : this.lastVopBlock + 1;
        const result = await this.client.database.getOperations(blockNum);

        if (!result || !Array.isArray(result)) return;

        const ops = result.filter((op) => op.virtual_op > 0);

        log(`Loading virtual ops in block ${blockNum}, count: ${ops.length}`, 4);

        for (let i = 0; i < ops.length; i++) await this.streamOptions.onVirtualOp(ops[i], blockNum);

        this.lastVopBlock = blockNum;

        if (this.streamOptions.saveState)
            this.streamOptions.saveState({
                lastBlock: this.lastBlock,
                lastVopBlock: this.lastVopBlock,
            });
    }

    async processBlock(blockNum: number, currentBlockNum: number) {
        const block = await this.client.database.getBlock(blockNum);
        return this.processBlockHelper(block, blockNum, currentBlockNum);
    }

    async processBlockHelper(block: SignedBlock, blockNum: number, currentBlockNum: number) {
        // Log every 1000th block loaded just for easy parsing of logs, or every block depending on logging level
        log(`Processing block [${blockNum}], Head Block: ${currentBlockNum}, Blocks to head: ${currentBlockNum - blockNum}`, blockNum % 1000 == 0 ? 1 : 4);

        if (!block || !block.transactions) {
            // Block couldn't be loaded...this is typically because it hasn't been created yet
            log('Error loading block [' + blockNum + ']', 4);
            await timeout(1000);
            return;
        }

        if (this.streamOptions.onBlock) await this.streamOptions.onBlock(blockNum, block, currentBlockNum);

        if (this.streamOptions.onOp) {
            const block_time = new Date(block.timestamp + 'Z');

            // Loop through all of the transactions and operations in the block
            for (let i = 0; i < block.transactions.length; i++) {
                const trans = block.transactions[i];

                for (let i = 0; i < trans.operations.length; i++) {
                    const op = trans.operations[i];

                    try {
                        await this.streamOptions.onOp(op, blockNum, block.block_id, block.previous, block.transaction_ids[i], block_time, i);
                    } catch (e: any) {
                        log(`Error processing transaction [${block.transaction_ids[i]}]: ${e}`, 1, 'Red');
                    }
                }
            }
        }

        this.lastBlock = blockNum;

        if (this.streamOptions.saveState)
            this.streamOptions.saveState({
                lastBlock: this.lastBlock,
                lastVopBlock: this.lastVopBlock,
            });
    }

    async loadState() {
        // Check if state has been saved to disk, in which case load it
        if (fs.existsSync(this.streamOptions.stateFile)) {
            const state = JSON.parse(fs.readFileSync(this.streamOptions.stateFile).toString() || '{}');
            log('Restored saved state: ' + JSON.stringify(state));
            return state;
        }
    }

    saveState(state) {
        // Save the last block read to disk
        fs.writeFile(this.streamOptions.stateFile, JSON.stringify(state || {}), function (e: any) {
            if (e) log(e);
        });
    }

    /**
     * Return a asynchronous block number iterator.
     * @param options Feed options, can also be a block number to start from.
     */
    public async *getBlockNumbers(options?: BlockchainStreamOptions | number) {
        // const config = await this.client.database.getConfig()
        // const interval = config['BLOCK_INTERVAL'] as number
        const interval = 3;
        if (!options) {
            options = {};
        } else if (typeof options === 'number') {
            options = { from: options };
        }
        let current = await this.getCurrentBlockNum(options.mode);
        if (options.from !== undefined && options.from > current) {
            throw new Error(`From can't be larger than current block num (${current})`);
        }
        let seen = options.from !== undefined ? options.from : current;
        while (true) {
            while (current > seen) {
                if (options.to !== undefined && seen > options.to) {
                    return;
                }
                yield seen++;
            }
            await sleep(interval * 1000);
            current = await this.getCurrentBlockNum(options.mode);
        }
    }

    /**
     * Return a stream of block numbers, accepts same parameters as {@link getBlockNumbers}.
     */
    public getBlockNumberStream(options?: BlockchainStreamOptions | number) {
        return iteratorStream(this.getBlockNumbers(options));
    }

    /**
     * Return a asynchronous block iterator, accepts same parameters as {@link getBlockNumbers}.
     */
    public async *getBlocks(options?: BlockchainStreamOptions | number) {
        for await (const num of this.getBlockNumbers(options)) {
            yield await this.client.database.getBlock(num);
        }
    }

    /**
     * Return a stream of blocks, accepts same parameters as {@link getBlockNumbers}.
     */
    public getBlockStream(options?: BlockchainStreamOptions | number) {
        return iteratorStream(this.getBlocks(options));
    }

    /**
     * Return a asynchronous operation iterator, accepts same parameters as {@link getBlockNumbers}.
     */
    public async *getOperations(options?: BlockchainStreamOptions | number) {
        for await (const num of this.getBlockNumbers(options)) {
            const operations = await this.client.database.getOperations(num);
            for (const operation of operations) {
                yield operation;
            }
        }
    }

    /**
     * Return a stream of operations, accepts same parameters as {@link getBlockNumbers}.
     */
    public getOperationsStream(options?: BlockchainStreamOptions | number) {
        return iteratorStream(this.getOperations(options));
    }
}
