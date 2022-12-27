import { TEST_CLIENT } from './common';

describe('blockchain', function () {
    // it('should stream operations', async function () {
    //     await new Promise((resolve, reject) => {
    //         const stream = TEST_CLIENT.blockchain.getOperationsStream({
    //             from: 13300000,
    //             to: 13300001,
    //         });
    //         const ops: string[] = [];
    //         stream.on('data', (operation: AppliedOperation) => {
    //             ops.push(operation.op[0]);
    //         });
    //         stream.on('error', reject);
    //         stream.on('end', () => {
    //             expect(ops).toEqual(expectedOps);
    //             resolve(true);
    //         });
    //     });
    // });

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

    it('should get current block header', async function () {
        const now = Date.now();
        const header = await TEST_CLIENT.blockchain.getCurrentBlockHeader();
        const ts = new Date(header.timestamp + 'Z').getTime();
        expect(Math.abs(ts / 1000 - now / 1000)).toBeLessThan(120);
    });

    it('Cannot start later than head block', async function () {
        const headBlock = await TEST_CLIENT.blockchain.getCurrentBlockNum();
        const blockStream = await TEST_CLIENT.blockchain.getBlockNumbers({ from: headBlock + 1000 });
        await expect(blockStream.next()).rejects;
    });
});
