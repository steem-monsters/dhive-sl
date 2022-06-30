import assert from 'assert';

import { Client, Asset, Transaction, PrivateKey } from '..';
import { generatePassword } from '../chain/keys';
import { getTestnetAccounts, randomString, agent, TEST_NODE } from './common';

describe('database api', function () {
    // this.slow(500);
    jest.setTimeout(20 * 1000);

    // const client = Client.testnet({ agent });
    let serverConfig: { [key: string]: boolean | string | number };
    const client = new Client({ nodes: [TEST_NODE], agent });

    let acc: { username: string; password: string };
    // beforeAll(async function () {
    //     [acc] = await getTestnetAccounts();
    // });

    it('getDynamicGlobalProperties', async function () {
        const result = await client.database.getDynamicGlobalProperties();
        expect(Object.keys(result)).toEqual([
            'head_block_number',
            'head_block_id',
            'time',
            'current_witness',
            'total_pow',
            'num_pow_witnesses',
            'virtual_supply',
            'current_supply',
            'init_hbd_supply',
            'current_hbd_supply',
            'total_vesting_fund_hive',
            'total_vesting_shares',
            'total_reward_fund_hive',
            'total_reward_shares2',
            'pending_rewarded_vesting_shares',
            'pending_rewarded_vesting_hive',
            'hbd_interest_rate',
            'hbd_print_rate',
            'maximum_block_size',
            'required_actions_partition_percent',
            'current_aslot',
            'recent_slots_filled',
            'participation_count',
            'last_irreversible_block_num',
            'vote_power_reserve_rate',
            'delegation_return_period',
            'reverse_auction_seconds',
            'available_account_subsidies',
            'hbd_stop_percent',
            'hbd_start_percent',
            'next_maintenance_time',
            'last_budget_time',
            'next_daily_maintenance_time',
            'content_reward_percent',
            'vesting_reward_percent',
            'sps_fund_percent',
            'sps_interval_ledger',
            'downvote_pool_percent',
            'current_remove_threshold',
            'early_voting_seconds',
            'mid_voting_seconds',
            'max_consecutive_recurrent_transfer_failures',
            'max_recurrent_transfer_end_date',
            'min_recurrent_transfers_recurrence',
            'max_open_recurrent_transfers',
        ]);
    });

    it('getConfig', async function () {
        const result = await client.database.getConfig();
        // HIVE_ config stuff here
        const r = (key: string) => result['HIVE_' + key];
        serverConfig = result;
        // also test some assumptions made throughout the code
        const conf = await client.database.getConfig();
        expect(r('CREATE_ACCOUNT_WITH_HIVE_MODIFIER')).toEqual(30);
        expect(r('CREATE_ACCOUNT_DELEGATION_RATIO')).toEqual(5);
        expect(r('100_PERCENT')).toEqual(10000);
        expect(r('1_PERCENT')).toEqual(100);

        const version = await client.call('database_api', 'get_version', {});
        // TODO: uncomment after HF24
        // assert.equal(version["chain_id"], client.options.chainId);
    });

    it('getBlockHeader', async function () {
        const result = await client.database.getBlockHeader(1);
        expect(result.previous).toEqual('0000000000000000000000000000000000000000');
    });

    it('getBlock', async function () {
        const result = await client.database.getBlock(1);
        expect(result.previous).toEqual('0000000000000000000000000000000000000000');
        expect(result.signing_key).toEqual(serverConfig['HIVE_INIT_PUBLIC_KEY_STR']);
    });

    it('getOperations', async function () {
        const result = await client.database.getOperations(1);
        console.log(result);
        expect(result.length).toEqual(5);
        expect(result[0].op[0]).toEqual('account_created');
    });

    it('getDiscussions', async function () {
        const r1 = await client.database.getDiscussions('comments', {
            start_author: 'almost-digital',
            start_permlink: 're-pal-re-almost-digital-dsteem-a-strongly-typed-steem-client-library-20170702t131034262z',
            limit: 1,
        });
        expect(r1.length).toEqual(1);
        expect(r1[0].body).toEqual(
            '🙏 Yeah piston seems dead (in favour of steam-python maybe? the codebases are very similar, not sure which came first though) Looking forward to some PRs! :)',
        );
    });

    it('getTransaction', async function () {
        const tx = await client.database.getTransaction('c20a84c8a12164e1e0750f0ee5d3c37214e2f073');
        expect(tx.signatures).toEqual(['201e02e8daa827382b1a3aefb6809a4501eb77aa813b705be4983d50d74c66432529601e5ae43981dcba2a7e171de5fd75be2e1820942260375d2daf647df2ccaa']);
        try {
            await client.database.getTransaction('c20a84c8a12164e1e0750f0ee5d3c37214e2f071');
            expect(false).toBeTruthy();
        } catch (error: any) {
            expect(error.message).toEqual('Assert Exception:false: Unknown Transaction c20a84c8a12164e1e0750f0ee5d3c37214e2f071');
        }
    });

    it('getChainProperties', async function () {
        const props = await client.database.getChainProperties();
        expect(Asset.from(props.account_creation_fee).symbol).toEqual('HIVE');
    });

    it('getCurrentMedianHistoryPrice', async function () {
        const price = await client.database.getCurrentMedianHistoryPrice();
        expect(Asset.from(price.base).symbol).toEqual('HBD');
        expect(price.quote.symbol).toEqual('HIVE');
    });

    // this tests for delegations from the hive account
    it('getVestingDelegations', async function () {
        // this.slow(5 * 1000);
        const [delegation] = await client.database.getVestingDelegations('mahdiyari', '', 1);
        if (!delegation) {
            return;
        }
        expect(delegation.delegator).toEqual('mahdiyari');
        expect(typeof delegation.id).toEqual('number');
        expect(Asset.from(delegation.vesting_shares).symbol).toEqual('VESTS');
    });

    // it('verifyAuthority', async function () {
    //     // this.slow(5 * 1000);
    //     const tx = new Transaction({
    //         ref_block_num: 0,
    //         ref_block_prefix: 0,
    //         expiration: '2000-01-01T00:00:00',
    //         operations: [
    //             [
    //                 'custom_json',
    //                 {
    //                     required_auths: [],
    //                     required_posting_auths: ['test'],
    //                     id: 'rpc-params',
    //                     json: '{"foo": "bar"}',
    //                 },
    //             ],
    //         ],
    //         extensions: [],
    //     });
    //     const key = PrivateKey.fromLogin('test', generatePassword(), 'posting');

    //     const stx = client.broadcast.sign(tx, key);
    //     const rv = await client.database.verifyAuthority(stx);
    //     expect(rv).toBeTruthy();
    //     // const bogusKey = PrivateKey.fromSeed("ogus");
    //     // try {
    //     //   await client.database.verifyAuthority(
    //     //     client.broadcast.sign(tx, bogusKey)
    //     //   );
    //     //   assert(false, "should not be reached");
    //     // } catch (error) {
    //     //   assert.equal(error.message, `Missing Posting Authority ${acc.username}`);
    //     // }
    // });
});
