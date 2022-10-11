/**
 * @file RC API helpers.
 * @author Wolf
 * @license BSD-3-Clause-No-Military-License
 */

import { Account } from '../chain/account';
import { getVests } from '../chain/misc';
import { Manabar, RCAccount, RCDelegation, RCParams, RCPool } from '../chain/rc';
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
     */
    public async getRCAccount(username: string): Promise<RCAccount> {
        const result = await this.getRCAccounts([username]);
        return result[0];
    }

    /**
     * Returns RC data for array of usernames or a single string
     */
    public async getRCAccounts(usernames: string[]): Promise<RCAccount[]> {
        const result: { rc_accounts: RCAccount[] } = await this.call('find_rc_accounts', { accounts: Array.isArray(usernames) ? usernames : [usernames] });
        return result?.rc_accounts ?? [];
    }

    /**
     * Returns RC data for array of usernames
     */
    public async listRCAccounts(start: number, limit: number): Promise<RCAccount[]> {
        const result = await this.call('list_rc_accounts', { start, limit });
        return result?.rc_accounts ?? [];
    }

    /**
     * Returns all RC delegations from a given account and optionally also to a specific account
     */
    public async getDirectDelegations(from: string, to?: string, limit = 100): Promise<RCDelegation[]> {
        const result = await this.call('list_rc_direct_delegations', { start: [from, to], limit });
        return result?.rc_direct_delegations || [];
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
     */
    public async getRCMana(username: string): Promise<Manabar> {
        const accounts = await this.getRCAccounts([username]);
        return accounts?.length > 0 ? this.calculateRCMana(accounts[0]) : { current_mana: 0, max_mana: 0, percentage: 0 };
    }

    /**
     * Calculates roughly the amount of RC you'd get from Hivepower
     */
    public calculateRoughRCFromHP(hp: number) {
        return hp * 2 * 1000000000;
    }

    /**
     * Makes a API call and returns the VP mana-data for a specified username
     */
    public async getVPMana(username: string): Promise<Manabar> {
        const account = await this.client.database.getAccount(username, { logErrors: false });
        return account ? this.calculateVPMana(account) : { current_mana: 0, max_mana: 0, percentage: 0 };
    }

    /**
     * Calculates the RC mana-data based on an RCAccount - findRCAccounts()
     */
    public calculateRCMana(rc_account: RCAccount): Manabar {
        return this._calculateManabar(Number(rc_account.max_rc), rc_account.rc_manabar);
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
        let percentage: number = Math.round((current_mana / max_mana) * 10000);

        if (!isFinite(percentage) || percentage < 0) {
            percentage = 0;
        } else if (percentage > 10000) {
            percentage = 10000;
        }

        return { current_mana, max_mana, percentage };
    }
}
