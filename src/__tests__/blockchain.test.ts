import { Client, SignedBlock, AppliedOperation } from '..';
import { agent, TEST_CLIENT, TEST_NODE } from './common';

describe('blockchain', function () {
    // this.slow(5 * 1000);
    jest.setTimeout(60 * 1000);

    const expectedIds = ['0000000109833ce528d5bbfb3f6225b39ee10086', '00000002ed04e3c3def0238f693931ee7eebbdf1'];
    const expectedOps = [
        'vote',
        'effective_comment_vote',
        'vote',
        'effective_comment_vote',
        'comment',
        'vote',
        'effective_comment_vote',
        'vote',
        'effective_comment_vote',
        'vote',
        'effective_comment_vote',
        'vote',
        'effective_comment_vote',
        'custom_json',
        'producer_reward',
        'comment_payout_update',
        'author_reward',
        'comment_reward',
        'comment_payout_update',
        'comment_payout_update',
        'comment_payout_update',
        'fill_vesting_withdraw',
        'fill_vesting_withdraw',
        'comment',
        'comment',
        'vote',
        'effective_comment_vote',
        'vote',
        'effective_comment_vote',
        'vote',
        'effective_comment_vote',
        'vote',
        'effective_comment_vote',
        'comment',
        'custom_json',
        'custom_json',
        'custom_json',
        'custom_json',
        'claim_reward_balance',
        'custom_json',
        'vote',
        'effective_comment_vote',
        'comment',
        'comment_options',
        'custom_json',
        'vote',
        'effective_comment_vote',
        'producer_reward',
        'comment_payout_update',
        'comment_payout_update',
        'curation_reward',
        'author_reward',
        'comment_reward',
        'comment_payout_update',
        'comment_payout_update',
        'fill_vesting_withdraw',
        'fill_vesting_withdraw',
    ];

    it('should yield blocks', async function () {
        const ids: string[] = [];
        for await (const block of TEST_CLIENT.blockchain.getBlocks({ from: 1, to: 2 })) {
            ids.push(block.block_id);
        }
        expect(ids).toEqual(expectedIds);
    });

    it('should stream blocks', async function () {
        await new Promise((resolve, reject) => {
            const stream = TEST_CLIENT.blockchain.getBlockStream({ from: 1, to: 2 });
            const ids: string[] = [];
            stream.on('data', (block: SignedBlock) => {
                ids.push(block.block_id);
            });
            stream.on('error', reject);
            stream.on('end', () => {
                expect(ids).toEqual(expectedIds);
                resolve(true);
            });
        });
    });

    it('should yield operations', async function () {
        const ops: string[] = [];
        for await (const operation of TEST_CLIENT.blockchain.getOperations({
            from: 13300000,
            to: 13300001,
        })) {
            ops.push(operation.op[0]);
        }
        expect(ops).toEqual(expectedOps);
    });

    it('should stream operations', async function () {
        await new Promise((resolve, reject) => {
            const stream = TEST_CLIENT.blockchain.getOperationsStream({
                from: 13300000,
                to: 13300001,
            });
            const ops: string[] = [];
            stream.on('data', (operation: AppliedOperation) => {
                ops.push(operation.op[0]);
            });
            stream.on('error', reject);
            stream.on('end', () => {
                expect(ops).toEqual(expectedOps);
                resolve(true);
            });
        });
    });

    // nonsense - feel free to investigate
    // it("should yield latest blocks", async function() {
    //   const latest = await TEST_CLIENT.blockchain.getCurrentBlock(
    //     BlockchainMode.Latest
    //   );
    //   for await (const block of TEST_CLIENT.blockchain.getBlocks({
    //     mode: BlockchainMode.Latest
    //   })) {
    //     if (block.block_id === latest.block_id) {
    //       continue;
    //     }
    //     assert.equal(
    //       block.previous,
    //       latest.block_id,
    //       "should have the same block id"
    //     );
    //     break;
    //   }
    // });

    it('should handle errors on stream', async function () {
        await new Promise((resolve) => {
            const stream = TEST_CLIENT.blockchain.getBlockStream(Number.MAX_VALUE);
            stream.on('data', () => {
                expect(false).toBe(true);
            });
            stream.on('error', () => {
                resolve(true);
            });
        });
    });

    it('should get block number stream', async function () {
        const current = await TEST_CLIENT.blockchain.getCurrentBlockNum();
        await new Promise(async (resolve, reject) => {
            const stream = TEST_CLIENT.blockchain.getBlockNumberStream();
            stream.on('data', (num) => {
                expect(num).toBeGreaterThanOrEqual(current);
                resolve(true);
            });
            stream.on('error', reject);
        });
    });

    it('should get current block header', async function () {
        const now = Date.now();
        const header = await TEST_CLIENT.blockchain.getCurrentBlockHeader();
        const ts = new Date(header.timestamp + 'Z').getTime();
        expect(Math.abs(ts / 1000 - now / 1000)).toBeLessThan(120);
    });
});
