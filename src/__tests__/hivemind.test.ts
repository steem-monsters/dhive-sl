import assert from 'assert';
import { TEST_CLIENT } from './common';

describe('HivemindAPI', function () {
    // this.slow(500);
    // this.timeout(20 * 1000);

    let acc: { username: string; password: string };

    it('getRankedPosts', async () => {
        const r = await TEST_CLIENT.hivemind.getRankedPosts({ limit: 1, sort: 'trending', tag: '', observer: '' });
        //console.log('rankedposts', r)
        assert.equal(r.length, 1);
    });

    it('getCommunity', async () => {
        const r = await TEST_CLIENT.hivemind.getCommunity({ name: 'hive-148441', observer: '' });
        // console.log('community', r)
        //assert.equal(r.length, 1)
    });

    it('getAccountNotifications', async () => {
        const r = await TEST_CLIENT.hivemind.getAccountNotifications({ account: 'acidyo', limit: 2 });
        // console.log('notifies', r)
        //assert.equal(r.length, 1)
    });

    it('listCommunities', async () => {
        const r = await TEST_CLIENT.hivemind.listCommunities({ limit: 2 });
        // console.log('communities', r)
    });

    it('listAllSubscriptions', async () => {
        const r = await TEST_CLIENT.hivemind.listAllSubscriptions({ account: 'acidyo' });
        // console.log('subscriptions', r)
        //assert.equal(r.length, 1)
    });
});
