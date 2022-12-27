import { TEST_CLIENT } from './common';

describe('HivemindAPI', function () {
    it('getRankedPosts', async () => {
        const r = await TEST_CLIENT.hivemind.getRankedPosts({ limit: 1, sort: 'trending', tag: '', observer: '' });
        expect(r.length).toEqual(1);
    });

    it('getCommunity', async () => {
        const r = await TEST_CLIENT.hivemind.getCommunity({ name: 'hive-111111', observer: '' });
        expect(r.name).toEqual('hive-111111');
    });

    it('getAccountNotifications', async () => {
        const r = await TEST_CLIENT.hivemind.getAccountNotifications({ account: 'null', limit: 2 });
        expect(r.length).toEqual(2);
    });

    it('listCommunities', async () => {
        const r = await TEST_CLIENT.hivemind.listCommunities({ limit: 2 });
        expect(r.length).toEqual(2);
    });

    it('listAllSubscriptions', async () => {
        const r = await TEST_CLIENT.hivemind.listAllSubscriptions({ account: 'acidyo' });
        expect(r.length).toBeGreaterThan(0);
    });
});
