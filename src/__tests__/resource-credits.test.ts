import assert from 'assert';
import { RCAccount } from '../chain/rc';
import { TEST_CLIENT } from './common';

describe('rc_api', function () {
    // this.slow(500);
    jest.setTimeout(20 * 1000);

    it('should get RC Mana', async () => {
        const account = await TEST_CLIENT.rc.getRCMana('therealwolf');
        expect(account?.current_mana > 0).toBeTruthy();
    });

    it('should get RC Account', async () => {
        const account = await TEST_CLIENT.rc.getRCAccount('therealwolf');
        expect(account.account === 'therealwolf').toBeTruthy();
    });

    it('calculateVPMana', () => {
        const account: any = {
            name: 'therealwolf',
            voting_manabar: {
                current_mana: 130168665536029,
                last_update_time: Date.now() / 1000,
            },
            vesting_shares: '80241942 VESTS',
            delegated_vesting_shares: '60666472 VESTS',
            received_vesting_shares: '191002659 VESTS',
            vesting_withdraw_rate: 0,
            to_withdraw: 0,
            withdrawn: 0,
        };

        let bar = TEST_CLIENT.rc.calculateVPMana(account);
        assert.equal(bar.percentage, 6181);
        account.voting_manabar.last_update_time = 1537064449;
        bar = TEST_CLIENT.rc.calculateVPMana(account);
        assert.equal(bar.percentage, 10000);
    });

    it('calculateRCMana', () => {
        const rc_account: RCAccount = {
            account: 'therealwolf',
            rc_manabar: {
                current_mana: '100000',
                last_update_time: 1537064449,
            },
            max_rc_creation_adjustment: {
                amount: '500',
                precision: 3,
                nai: '@@000000021',
            },
            max_rc: '1000000',
            delegated_rc: '1000',
            received_delegated_rc: '1000',
        };

        let bar = TEST_CLIENT.rc.calculateRCMana(rc_account);
        assert.equal(bar.percentage, 10000);
        rc_account.rc_manabar.last_update_time = Date.now() / 1000;
        bar = TEST_CLIENT.rc.calculateRCMana(rc_account);
        assert(bar.percentage >= 1000 && bar.percentage < 1100);
    });

    // it('getRCDelegations', async () => {
    //     const result = await TEST_CLIENT.rc.findDirectDelegations('therealwolf');
    //     expect(result.length).toBeGreaterThan(0);
    // });
});