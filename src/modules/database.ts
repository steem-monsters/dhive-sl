import { Account, Authority } from '../chain/account';
import { AppliedOperation, OperationName, VirtualOperationName } from '../chain/operation';
import { BlockHeader, SignedBlock } from '../chain/block';
import { ChainProperties, VestingDelegation } from '../chain/misc';
import { ClientFetch } from '../clientFetch';
import { Discussion } from '../chain/comment';
import { DynamicGlobalProperties } from '../chain/misc';
import { KeyRole, PublicKey } from '../chain/keys';
import { LogLevel, log } from '../utils/utils';
import { Price } from '../chain/asset';
import { SignedTransaction, SignedTransactionInBlock } from '../chain/transaction';
import { makeBitMaskFilter } from '../utils/bitmaskFilter';

export interface TxSignProperties {
    head_block_number: DynamicGlobalProperties['head_block_number'];
    head_block_id: string;
    time: number;
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

export interface AccountAuths {
    keys: AccountAuthsKey[];
    accounts: AccountAuthsAccount[];
    threshold: number;
}

export interface AccountAuthsKey {
    key: string;
    weight: number;
    threshold_reached: boolean;
}

export interface AccountAuthsAccount extends AccountAuthsKey {
    account: string;
    account_weight: number;
    account_threshold: number;
}

export class DatabaseAPI {
    private txSignProperties: TxSignProperties;
    constructor(private readonly fetch: ClientFetch) {}

    /**
     * Convenience for calling `condenser_api`.
     */
    public call(method: string, params?: any[]) {
        return this.fetch.call(`condenser_api.${method}`, params);
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
    public async getTxSignProperties(force?: boolean) {
        // Realods txSignProperties if it's empty or older than 60 seconds
        if (force || !this.txSignProperties || this.txSignProperties.time < Date.now() - 60 * 1000) {
            const result = await this.getDynamicGlobalProperties();
            this.txSignProperties = {
                head_block_number: result.head_block_number,
                head_block_id: result.head_block_id,
                time: new Date(result.time + 'Z').getTime(),
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
    public async getBlock(blockNum: number): Promise<SignedBlock> {
        const block: SignedBlock = await this.call('get_block', [blockNum]);
        if (block)
            block.transactions = block.transactions.map(
                (transaction) =>
                    new SignedTransactionInBlock({
                        expiration: transaction.expiration,
                        extensions: transaction.extensions,
                        operations: transaction.operations,
                        ref_block_num: transaction.ref_block_num,
                        ref_block_prefix: transaction.ref_block_prefix,
                        transaction_id: transaction.transaction_id,
                        block_num: transaction.block_num,
                        signatures: transaction.signatures,
                        transaction_num: transaction.transaction_num,
                    }),
            );
        return block;
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
        const accountNames = new Set(accounts.map((a) => a.name));
        const isValidResult = accounts && accounts.length === names.length;
        if (!isValidResult) {
            if (!accounts || accounts.length <= 0) {
                if (logErrors) log(`Error loading account${accounts.length > 1 ? 's' : ''}: ${names.join(', ')}`, logErrors ? LogLevel.Warning : LogLevel.Debug);
                return [];
            }
            const missing = names.filter((name) => !accountNames.has(name));
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
        if (!finalAccount?.[role]?.key_auths) return [];

        if (role === 'memo') return [{ key: finalAccount.memo_key, weight: 1 }];
        return this.convertKeysFromAccount(finalAccount[role]);
    }

    /**
     * Returns the public keys of a specified role from a given account name
     */
    public async getAccountAuths(account: string | Account, role: KeyRole): Promise<AccountAuths> {
        const finalAccount = typeof account === 'string' ? await this.getAccount(account) : account;
        const result: AccountAuths = { keys: [], accounts: [], threshold: finalAccount?.[role]?.weight_threshold ?? 1 };
        if (!finalAccount) return result;

        const auths: Authority | undefined = finalAccount?.[role];
        const accountAuths: Authority['account_auths'] = auths?.account_auths ?? [];

        if (role === 'memo') {
            result.keys = [{ key: finalAccount.memo_key, weight: 1, threshold_reached: true }];
        } else {
            // This only goes down one level to verify authorities, even though Hive supports multiple levels
            const accounts = await this.getAccounts(
                accountAuths.map((a) => a[0]),
                { allOrNothing: false, logErrors: false },
            );
            result.keys = this.convertKeysFromAccount(auths);
            result.accounts = ([] as AccountAuths['accounts']).concat(
                ...accounts.map((a) => {
                    const baseAccountAuth = accountAuths.find((aa) => aa[0] === a.name);
                    const baseAccountWeight = baseAccountAuth?.[1] || 1;
                    const baseAccountThreshold = auths?.weight_threshold || 1;
                    const array: AccountAuths['accounts'] = this.convertAccountAuthsFromAccount(a.name, a[role], baseAccountWeight, baseAccountThreshold).map((k) => {
                        return {
                            key: k.key,
                            weight: k.weight,
                            account: a.name,
                            account_weight: k.account_weight,
                            account_threshold: k.account_threshold,
                            threshold_reached: k.threshold_reached,
                        };
                    });
                    return array;
                }),
            );
        }

        return result;
    }

    private convertKeysFromAccount(auth: Authority | undefined): AccountAuthsKey[] {
        return (auth?.key_auths || []).map((keyArray) => {
            const key = keyArray[0];
            const weight = keyArray[1];
            return {
                key: key instanceof PublicKey ? key.toString() : key,
                weight,
                threshold_reached: weight >= (auth?.weight_threshold || 1),
            };
        });
    }

    private convertAccountAuthsFromAccount(accountName: string, auth: Authority | undefined, baseAccountWeight: number, baseAccountThreshold: number): AccountAuthsAccount[] {
        return (auth?.key_auths || []).map((keyArray) => {
            const key = keyArray[0];
            const weight = keyArray[1];
            return {
                key: key instanceof PublicKey ? key.toString() : key,
                weight,
                account: accountName,
                account_weight: baseAccountWeight,
                account_threshold: auth?.weight_threshold || 1,
                threshold_reached: weight >= (auth?.weight_threshold || 1) && baseAccountWeight >= baseAccountThreshold,
            };
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
     */
    public getAccountHistory(account: string, from = -1, limit = 250, filteredOperationNames?: (OperationName | VirtualOperationName)[]): Promise<[[number, AppliedOperation]]> {
        let params = [account, from, limit];
        if (filteredOperationNames && Array.isArray(filteredOperationNames)) {
            const bitmask = makeBitMaskFilter(filteredOperationNames);
            if (bitmask.length !== 2) throw Error('Invalid bitmask generated by filteredOperationNames');
            params = params.concat(bitmask);
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
