import { Asset } from '../src';
import { TEST_CLIENT } from './common';
import { sortAsc } from '../src/utils/utils';

describe('database api', function () {
    // this.slow(500);
    jest.setTimeout(20 * 1000);

    let serverConfig: { [key: string]: boolean | string | number };

    it('should getAccount', async () => {
        const account = await TEST_CLIENT.database.getAccount('dhive-sl', { logErrors: false });
        expect(account?.name).toEqual('dhive-sl');
    });

    it('should getAccountAuths', async () => {
        const auths = await TEST_CLIENT.database.getAccountAuths('dhive-sl', 'posting');
        expect(auths.keys.length === 3).toBeTruthy();
        expect(auths.accounts.length === 4).toBeTruthy();
        expect(auths.threshold).toEqual(2);

        for (const keyAuth of auths.keys) {
            if (keyAuth.key === 'STM6J2hTGcwU9xSrcb5mzyLPw3Wig8YCcvDrQZ8sMLSz3JN4BQWVj') {
                expect(keyAuth.weight).toEqual(2);
                expect(keyAuth.threshold_reached).toBeTruthy();
            } else if (keyAuth.key === 'STM7Mn9hpcaTJoUNzpH8EQJXTC6sjUptEoTgdKwvjM4DCTN3xDWjE') {
                expect(keyAuth.weight).toEqual(1);
                expect(keyAuth.threshold_reached).toBeFalsy();
            } else if (keyAuth.key === 'STM8buYSYDiZ5gwLsqUBsGyvXaiWWiuwcW8d8d1snfXHsH81KMW66') {
                expect(keyAuth.weight).toEqual(1);
                expect(keyAuth.threshold_reached).toBeFalsy();
            }
        }

        for (const accountAuth of auths.accounts) {
            if (accountAuth.key === 'STM6JeCCbawL6yptpuUstnEroaUVbc46EYYLgNkzgsTBGSydFz6qk') {
                expect(accountAuth.weight).toEqual(2);
                expect(accountAuth.account).toEqual('dhive-sl-2');
                expect(accountAuth.account_weight).toEqual(2);
                expect(accountAuth.account_threshold).toEqual(2);
                expect(accountAuth.threshold_reached).toBeTruthy();
            } else if (accountAuth.key === 'STM6oZs7MaFo9VC4NYUy3kdqkAG5cT8sKvUWNw3SmHdSmj6DSaTDB') {
                expect(accountAuth.weight).toEqual(1);
                expect(accountAuth.account).toEqual('dhive-sl-2');
                expect(accountAuth.account_weight).toEqual(2);
                expect(accountAuth.account_threshold).toEqual(2);
                expect(accountAuth.threshold_reached).toBeFalsy();
            } else if (accountAuth.key === 'STM72nZZHPZu34634TML6vbxoz4PwGpzCabYcQjbpFbCegiafT9FJ') {
                expect(accountAuth.weight).toEqual(1);
                expect(accountAuth.account).toEqual('dhive-sl-2');
                expect(accountAuth.account_weight).toEqual(2);
                expect(accountAuth.account_threshold).toEqual(2);
                expect(accountAuth.threshold_reached).toBeFalsy();
            } else if (accountAuth.key === 'STM6q23tKVxbVhcTWEBo39Gxb5JP4ipNsmpqBLEJuPwtv7srEAyjD') {
                expect(accountAuth.weight).toEqual(1);
                expect(accountAuth.account).toEqual('dhive-sl-3');
                expect(accountAuth.account_weight).toEqual(1);
                expect(accountAuth.account_threshold).toEqual(1);
                expect(accountAuth.threshold_reached).toBeFalsy();
            }
        }

        const activeAuths = await TEST_CLIENT.database.getAccountAuths('dhive-sl', 'active');
        expect(activeAuths.keys.length === 1).toBeTruthy();
        expect(activeAuths.accounts.length === 1).toBeTruthy();
        expect(activeAuths.threshold).toEqual(1);
    });

    it('getDynamicGlobalProperties', async function () {
        const result = await TEST_CLIENT.database.getDynamicGlobalProperties();
        expect(sortAsc(Object.keys(result))).toEqual(
            sortAsc([
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
                'proposal_fund_percent',
                'dhf_interval_ledger',
                'downvote_pool_percent',
                'current_remove_threshold',
                'early_voting_seconds',
                'mid_voting_seconds',
                'max_consecutive_recurrent_transfer_failures',
                'max_recurrent_transfer_end_date',
                'min_recurrent_transfers_recurrence',
                'max_open_recurrent_transfers',
            ]),
        );
    });

    it('getConfig', async function () {
        const result = await TEST_CLIENT.database.getConfig();
        // HIVE_ config stuff here
        const r = (key: string) => result['HIVE_' + key];
        serverConfig = result;
        // also test some assumptions made throughout the code
        const conf = await TEST_CLIENT.database.getConfig();
        expect(r('CREATE_ACCOUNT_WITH_HIVE_MODIFIER')).toEqual(30);
        expect(r('CREATE_ACCOUNT_DELEGATION_RATIO')).toEqual(5);
        expect(r('100_PERCENT')).toEqual(10000);
        expect(r('1_PERCENT')).toEqual(100);

        const version = await TEST_CLIENT.call('database_api', 'get_version', {});
        // TODO: uncomment after HF24
        // assert.equal(version["chain_id"], TEST_CLIENT.options.chainId);
    });

    it('getBlockHeader', async function () {
        const result = await TEST_CLIENT.database.getBlockHeader(1);
        expect(result.previous).toEqual('0000000000000000000000000000000000000000');
    });

    it('getBlock', async function () {
        const result = await TEST_CLIENT.database.getBlock(1);
        expect(result.previous).toEqual('0000000000000000000000000000000000000000');
        expect(result.signing_key).toEqual(serverConfig['HIVE_INIT_PUBLIC_KEY_STR']);
    });

    it('getOperations', async function () {
        const result = await TEST_CLIENT.database.getOperations(1);
        expect(result.length).toBeGreaterThan(0);
    });

    it('getDiscussions', async function () {
        const r1 = await TEST_CLIENT.database.getDiscussions('comments', {
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
        const tx = await TEST_CLIENT.database.getTransaction('c20a84c8a12164e1e0750f0ee5d3c37214e2f073');
        expect(tx.signatures).toEqual(['201e02e8daa827382b1a3aefb6809a4501eb77aa813b705be4983d50d74c66432529601e5ae43981dcba2a7e171de5fd75be2e1820942260375d2daf647df2ccaa']);
        try {
            await TEST_CLIENT.database.getTransaction('c20a84c8a12164e1e0750f0ee5d3c37214e2f071');
            expect(false).toBeTruthy();
        } catch (error: any) {
            expect(error.message.includes('Unknown Transaction c20a84c8a12164e1e0750f0ee5d3c37214e2f071')).toBeTruthy();
        }
    });

    it('getChainProperties', async function () {
        const props = await TEST_CLIENT.database.getChainProperties();
        expect(Asset.from(props.account_creation_fee).symbol).toEqual('HIVE');
    });

    it('getCurrentMedianHistoryPrice', async function () {
        const price = await TEST_CLIENT.database.getCurrentMedianHistoryPrice();
        expect(Asset.from(price.base).symbol).toEqual('HBD');
        expect(price.quote.symbol).toEqual('HIVE');
    });

    // this tests for delegations from the hive account
    it('getVestingDelegations', async function () {
        // this.slow(5 * 1000);
        const [delegation] = await TEST_CLIENT.database.getVestingDelegations('mahdiyari', '', 1);
        if (!delegation) {
            return;
        }
        expect(delegation.delegator).toEqual('mahdiyari');
        expect(typeof delegation.id).toEqual('number');
        expect(Asset.from(delegation.vesting_shares).symbol).toEqual('VESTS');
    });

    it('getAccountHistory', async () => {
        const transfers = await TEST_CLIENT.database.getAccountHistory('null', -1, 2, ['transfer']);
        expect(transfers.length).toEqual(2);
        expect(transfers[0][1].op[0]).toEqual('transfer');
    });

    // it('verifyAuthority', async function () {
    //     // this.slow(5 * 1000);
    //     const txSignProperties = await TEST_CLIENT.database.getTxSignProperties();
    //     const tx = Transaction.from(
    //         txSignProperties,
    //         [
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
    //         'latest',
    //     );

    //     const key = PrivateKey.fromLogin('test', generatePassword(), 'posting');
    //     const stx = TEST_CLIENT.broadcast.sign(tx, key);
    //     const rv = await TEST_CLIENT.database.verifyAuthority(stx);
    //     expect(rv).toBeTruthy();
    //     // const bogusKey = PrivateKey.fromSeed("ogus");
    //     // try {
    //     //   await TEST_CLIENT.database.verifyAuthority(
    //     //     TEST_CLIENT.broadcast.sign(tx, bogusKey)
    //     //   );
    //     //   assert(false, "should not be reached");
    //     // } catch (error) {
    //     //   assert.equal(error.message, `Missing Posting Authority ${acc.username}`);
    //     // }
    // });
});
