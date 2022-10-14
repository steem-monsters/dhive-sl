/**
 * @file RC API helpers.
 * @author Wolf
 * @license BSD-3-Clause-No-Military-License
 */

import { Account } from '../chain/account';
import { RCAsset } from '../chain/asset';
import { getVests } from '../chain/misc';
import { RCAccountExtended, Manabar, RCAccount, RCDelegation, RCParams, RCPool } from '../chain/rc';
import { Client } from '../client';

export class RCAPI {
    constructor(readonly client: Client) {}

    /**
     * Convenience for calling `rc_api`.
     */
    public call(method: string, params?: any) {
        return this.client.call('rc_api', method, params);
    }

    /**
     * Returns RC data for array of usernames or a single string
     *
     * #### Calculation RC
     * RC = RCS / 1,000,000,000
     * 25 = 25,000,000,000 / 1,000,000,000
     *
     * #### Calculation RCS
     * RCS = RC * 1,000,000,000
     * 25,000,000,000 = 25 * 1,000,000,000
     */
    public async getRCAccount(username: string): Promise<RCAccountExtended> {
        const result = await this.getRCAccounts([username]);
        return result[0] || null;
    }

    /**
     * Returns RC data for array of usernames or a single string
     *
     * #### Calculation RC
     * RC = RCS / 1,000,000,000
     * 25 = 25,000,000,000 / 1,000,000,000
     *
     * #### Calculation RCS
     * RCS = RC * 1,000,000,000
     * 25,000,000,000 = 25 * 1,000,000,000
     */
    public async getRCAccounts(usernames: string[]): Promise<RCAccountExtended[]> {
        const result: { rc_accounts: RCAccount[] } = await this.call('find_rc_accounts', { accounts: Array.isArray(usernames) ? usernames : [usernames] });
        const rc_accounts = result?.rc_accounts ?? [];

        return rc_accounts.map((rc_account) => {
            const manabar = this.calculateRCMana(rc_account);
            const rcAccount: RCAccountExtended = {
                account: rc_account.account,
                max: this.getRCObject(rc_account.max_rc),
                current: this.getRCObject(manabar.current_mana),
                percentage: manabar.percentage,
                delegated: this.getRCObject(rc_account.delegated_rc),
                received: this.getRCObject(rc_account.received_delegated_rc),
                max_rc_creation_adjustment: rc_account.max_rc_creation_adjustment,
                last_update_time: rc_account.rc_manabar.last_update_time,
            };
            return rcAccount;
        });
    }

    /**
     * Returns RC data for array of usernames
     *
     * #### Calculation RC
     * RC = RCS / 1,000,000,000
     * 25 = 25,000,000,000 / 1,000,000,000
     *
     * #### Calculation RCS
     * RCS = RC * 1,000,000,000
     * 25,000,000,000 = 25 * 1,000,000,000
     */
    public async listRCAccounts(start: number, limit: number): Promise<RCAccountExtended[]> {
        const result = await this.call('list_rc_accounts', { start, limit });
        return (result?.rc_accounts ?? []).map((rc_account) => {
            const manabar = this.calculateRCMana(rc_account);
            const rcAccount: RCAccountExtended = {
                account: rc_account.account,
                max: this.getRCObject(rc_account.max_rc),
                current: this.getRCObject(manabar.current_mana),
                percentage: manabar.percentage,
                delegated: this.getRCObject(rc_account.delegated_rc),
                received: this.getRCObject(rc_account.received_delegated_rc),
                max_rc_creation_adjustment: rc_account.max_rc_creation_adjustment,
                last_update_time: rc_account.rc_manabar.last_update_time,
            };
            return rcAccount;
        });
    }

    /**
     * Returns all RC delegations from a given account and optionally also to a specific account
     *
     * #### Calculation RC
     * RC = RCS / 1,000,000,000
     * 25 = 25,000,000,000 / 1,000,000,000
     *
     * #### Calculation RCS
     * RCS = RC * 1,000,000,000
     * 25,000,000,000 = 25 * 1,000,000,000
     */
    public async getDelegations(from: string, to?: string, limit = 100): Promise<RCDelegation[]> {
        const result = await this.call('list_rc_direct_delegations', { start: [from, to], limit });
        return (result?.rc_direct_delegations || []).map((r) => {
            const delegation: RCDelegation = { from: r.from, to: r.to, delegation: this.getRCObject(r.delegated_rc) };
            return delegation;
        });
    }

    private getRCObject(rc: string | number) {
        const rcs = RCAsset.from(rc, 'RCS');
        return { rc: rcs.fromSatoshi(), rcs };
    }

    /**
     * Returns the global resource params
     */
    public async getResourceParams(): Promise<RCParams> {
        const result = await this.call('get_resource_params', {});
        return result?.resource_params ?? {};
    }

    /**
     * Returns the global resource pool
     */
    public async getResourcePool(): Promise<RCPool> {
        const result = await this.call('get_resource_pool', {});
        return result?.resource_pool ?? {};
    }

    /**
     * Makes a API call and returns the RC mana-data for a specified username
     * @deprecated use getRCAccount instead
     */
    public async getRCMana(username: string): Promise<Manabar> {
        const accounts = await this.getRCAccounts([username]);
        return accounts?.length > 0
            ? { current_mana: Number(accounts[0].current.rcs.amount), max_mana: Number(accounts[0].max.rc.amount), percentage: accounts[0].percentage }
            : { current_mana: 0, max_mana: 0, percentage: 0 };
    }

    /**
     * Calculates the RC mana-data based on an RCAccount - findRCAccounts()
     */
    public calculateRCMana(rc_account: RCAccount): Manabar {
        return this._calculateManabar(Number(rc_account.max_rc), rc_account.rc_manabar);
    }

    /**
     * Makes a API call and returns the VP mana-data for a specified username
     */
    public async getVPMana(username: string): Promise<Manabar> {
        const account = await this.client.database.getAccount(username, { logErrors: false });
        return account ? this.calculateVPMana(account) : { current_mana: 0, max_mana: 0, percentage: 0 };
    }

    /**
     * Calculates the RC mana-data based on an Account - getAccounts()
     */
    public calculateVPMana(account: Account): Manabar {
        const max_mana: number = getVests(account) * Math.pow(10, 6);
        return this._calculateManabar(max_mana, account.voting_manabar);
    }

    /**
     * Internal convenience method to reduce redundant code
     */
    private _calculateManabar(max_mana: number, { current_mana, last_update_time }): Manabar {
        const delta: number = Date.now() / 1000 - last_update_time;
        current_mana = Number(current_mana) + (delta * max_mana) / 432000;
        current_mana = current_mana > max_mana ? max_mana : current_mana;
        let percentage: number = Math.round((current_mana / max_mana) * 10000);

        if (!isFinite(percentage) || percentage < 0) {
            percentage = 0;
        } else if (percentage > 10000) {
            percentage = 10000;
        }

        return { current_mana: current_mana.toFixed(0), max_mana: max_mana, percentage: parseFloat(percentage.toFixed(0)) };
    }
}
