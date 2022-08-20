/**
 * @file Database API helpers.
 * @author Johan Nordberg <code@johan-nordberg.com>, Wolf
 * @license BSD-3-Clause-No-Military-License
 */

import { Account } from '../chain/account';
import { Price } from '../chain/asset';
import { BlockHeader, SignedBlock } from '../chain/block';
import { Discussion } from '../chain/comment';
import { DynamicGlobalProperties } from '../chain/misc';
import { ChainProperties, VestingDelegation } from '../chain/misc';
import { AppliedOperation } from '../chain/operation';
import { SignedTransaction } from '../chain/transaction';
import { log, LogLevel } from '../utils';
import { Client } from '../client';
import { KeyRole } from '../chain/keys/utils';
import { PublicKey } from '../chain/keys/keys';

export interface TxSignPropertiesBase {
    ref_block_num: DynamicGlobalProperties['last_irreversible_block_num'] | DynamicGlobalProperties['head_block_number'];
    ref_block_prefix: string;
}

export interface TxSignProperties {
    latest: TxSignPropertiesBase;
    irreversible: TxSignPropertiesBase;
    time: Date;
}

interface GetAccountOption {
    logErrors?: boolean;
}

interface GetAccountOptions extends GetAccountOption {
    allOrNothing?: boolean;
}

/**
 * Possible categories for `get_discussions_by_*`.
 */
export type DiscussionQueryCategory = 'active' | 'blog' | 'cashout' | 'children' | 'comments' | 'feed' | 'hot' | 'promoted' | 'trending' | 'votes' | 'created';

export interface DisqussionQuery {
    /**
     * Name of author or tag to fetch.
     */
    tag?: string;
    /**
     * Number of results, max 100.
     */
    limit: number;
    filter_tags?: string[];
    select_authors?: string[];
    select_tags?: string[];
    /**
     * Number of bytes of post body to fetch, default 0 (all)
     */
    truncate_body?: number;
    /**
     * Name of author to start from, used for paging.
     * Should be used in conjunction with `start_permlink`.
     */
    start_author?: string;
    /**
     * Permalink of post to start from, used for paging.
     * Should be used in conjunction with `start_author`.
     */
    start_permlink?: string;
    parent_author?: string;
    parent_permlink?: string;
}

export class DatabaseAPI {
    private txSignProperties: TxSignProperties;
    constructor(readonly client: Client) {}

    /**
     * Convenience for calling `condenser_api`.
     */
    public call(method: string, params?: any[]) {
        return this.client.call('condenser_api', method, params);
    }

    /**
     * Return state of server.
     */
    public getDynamicGlobalProperties(): Promise<DynamicGlobalProperties> {
        return this.call('get_dynamic_global_properties');
    }

    /**
     * Return median chain properties decided by witness.
     */
    public async getChainProperties(): Promise<ChainProperties> {
        return this.call('get_chain_properties');
    }

    /**
     * Loads & caches properties to sign transactions with
     */
    public async getTxSignProperties() {
        // Realods txSignProperties if it's empty or older than 60 seconds
        if (!this.txSignProperties || this.txSignProperties.time.getTime() < Date.now() - 60 * 1000) {
            const result = await this.getDynamicGlobalProperties();
            const irreversibleBlock = await this.getBlock(result.last_irreversible_block_num);

            this.txSignProperties = {
                latest: {
                    ref_block_num: result.head_block_number,
                    ref_block_prefix: result.head_block_id,
                },
                irreversible: {
                    ref_block_num: result.last_irreversible_block_num,
                    ref_block_prefix: irreversibleBlock.block_id,
                },
                time: new Date(result.time + 'Z'),
            };
        }

        return this.txSignProperties;
    }

    /**
     * Return all of the state required for a particular url path.
     * @param path Path component of url conforming to condenser's scheme
     *             e.g. `@almost-digital` or `trending/travel`
     */
    public async getState(path: string): Promise<any> {
        return this.call('get_state', [path]);
    }

    /**
     * Return median price in HBD for 1 HIVE as reported by the witnesses.
     */
    public async getCurrentMedianHistoryPrice(): Promise<Price> {
        return Price.from(await this.call('get_current_median_history_price'));
    }

    /**
     * Get list of delegations made by account.
     * @param account Account delegating
     * @param from Delegatee start offset, used for paging.
     * @param limit Number of results, max 1000.
     */
    public async getVestingDelegations(account: string, from = '', limit = 1000): Promise<VestingDelegation[]> {
        return this.call('get_vesting_delegations', [account, from, limit]);
    }

    /**
     * Return server config. See:
     * https://github.com/steemit/steem/blob/master/libraries/protocol/include/steemit/protocol/config.hpp
     */
    public getConfig(): Promise<{ [name: string]: string | number | boolean }> {
        return this.call('get_config');
    }

    /**
     * Return header for *blockNum*.
     */
    public getBlockHeader(blockNum: number): Promise<BlockHeader> {
        return this.call('get_block_header', [blockNum]);
    }

    /**
     * Return block *blockNum*.
     */
    public getBlock(blockNum: number): Promise<SignedBlock> {
        return this.call('get_block', [blockNum]);
    }

    /**
     * Return all applied operations in *blockNum*.
     */
    public getOperations(blockNum: number, onlyVirtual = false): Promise<AppliedOperation[]> {
        return this.call('get_ops_in_block', [blockNum, onlyVirtual]);
    }

    /**
     * Return array of discussions (a.k.a. posts).
     * @param by The type of sorting for the discussions, valid options are:
     *           `active` `blog` `cashout` `children` `comments` `created`
     *           `feed` `hot` `promoted` `trending` `votes`. Note that
     *           for `blog` and `feed` the tag is set to a username.
     */
    public getDiscussions(by: DiscussionQueryCategory, query: DisqussionQuery): Promise<Discussion[]> {
        return this.call(`get_discussions_by_${by}`, [query]);
    }

    /**
     * Return array of account info objects for the usernames passed.
     * @param names The accounts to fetch.
     */
    public async getAccounts(names: string[], { allOrNothing = false, logErrors = false }: GetAccountOptions = {}): Promise<Account[]> {
        const accounts: Account[] = await this.call('get_accounts', [names]);
        const isValidResult = accounts && accounts.length === names.length;
        if (!isValidResult) {
            if (!accounts || accounts.length <= 0) {
                if (logErrors) log(`Error loading account${accounts.length > 1 ? 's' : ''}: ${names.join(', ')}`, logErrors ? LogLevel.Warning : LogLevel.Debug);
                return [];
            }
            const missing = names.filter((name) => accounts.filter((r) => r.name === name).length === 0);
            if (missing.length > 0) {
                if (logErrors) log(`Error loading accounts: ${missing.join(',')}`, logErrors ? LogLevel.Warning : LogLevel.Debug);
                if (allOrNothing) {
                    if (logErrors) log(`Returning [] due to failOnMissing`, logErrors ? LogLevel.Warning : LogLevel.Debug);
                    return [];
                }
            }
        }
        return accounts;
    }

    /**
     * Returns account or null
     */
    public async getAccount(name: string, opts: GetAccountOption = {}) {
        const accounts = await this.getAccounts([name], opts);
        return accounts && accounts.length > 0 ? accounts[0] : null;
    }

    /**
     * Returns the public keys of a specified role from a given account name
     */
    public async getAccountPublicKeys(account: string | Account, role: KeyRole): Promise<{ key: string; weight: number }[]> {
        const finalAccount = typeof account === 'string' ? await this.getAccount(account) : account;
        if (!finalAccount) return [];

        if (role === 'memo') return [{ key: finalAccount.memo_key, weight: 1 }];
        if (!finalAccount[role].key_auths || finalAccount[role].key_auths.length === 0 || !finalAccount[role].key_auths[0] || !finalAccount[role].key_auths[0][0]) {
            return [];
        }

        return finalAccount[role].key_auths.map((keyArray) => {
            const key = keyArray[0];
            return { key: key instanceof PublicKey ? key.toString() : key, weight: keyArray[1] };
        });
    }

    /**
     * Returns the details of a transaction based on a transaction id.
     */
    public async getTransaction(txId: string): Promise<SignedTransaction> {
        return this.call('get_transaction', [txId]);
    }

    /**
     * Returns one or more account history objects for account operations
     *
     * @param account The account to fetch
     * @param from The starting index
     * @param limit The maximum number of results to return
     * @param operations_bitmask Generated by dhive.utils.makeBitMaskFilter() - see example below
     * @example
     * const op = dhive.utils.operationOrders
     * const operationsBitmask = dhive.utils.makeBitMaskFilter([
     *   op.transfer,
     *   op.transfer_to_vesting,
     *   op.withdraw_vesting,
     *   op.interest,
     *   op.liquidity_reward,
     *   op.transfer_to_savings,
     *   op.transfer_from_savings,
     *   op.escrow_transfer,
     *   op.cancel_transfer_from_savings,
     *   op.escrow_approve,
     *   op.escrow_dispute,
     *   op.escrow_release,
     *   op.fill_convert_request,
     *   op.fill_order,
     *   op.claim_reward_balance,
     * ])
     */
    public getAccountHistory(account: string, from: number, limit: number, operation_bitmask?: [number, number]): Promise<[[number, AppliedOperation]]> {
        let params = [account, from, limit];
        if (operation_bitmask && Array.isArray(operation_bitmask)) {
            if (operation_bitmask.length !== 2) {
                throw Error('operation_bitmask should be generated by the helper function');
            }
            params = params.concat(operation_bitmask);
        }
        return this.call('get_account_history', params);
    }

    /**
     * Verify signed transaction.
     */
    public async verifyAuthority(stx: SignedTransaction): Promise<boolean> {
        return this.call('verify_authority', [stx]);
    }

    /** return rpc node version */
    public async getVersion(): Promise<object> {
        return this.call('get_version', []);
    }
}
