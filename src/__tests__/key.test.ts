import { TEST_CLIENT } from './common';

describe('account_by_key_api', function () {
    // this.slow(500);
    // this.timeout(20 * 1000);

    it('get_key_references exists', async () => {
        const accounts = await TEST_CLIENT.keys.getKeyReferences(['STM1111111111111111111111111111111114T1Anm']);
        expect(accounts.includes('hive.fund')).toBeTruthy();
    });

    it('get_key_references doesnt exist', async () => {
        const accounts = await TEST_CLIENT.keys.getKeyReferences(['STM4yTPEH7qt7VLHvkiRYA1AEnWXdpwGu2VsP5BHLiqxkmewDGjXL']);
        expect(accounts.length === 0).toBeTruthy();
    });
});
// hive.fund
