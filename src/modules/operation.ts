/**
 * @file Operation helper
 * @author Wolf
 */

import assert from 'assert';
import { Authority, AuthorityType } from '../chain/account';
import { Asset, RCAsset } from '../chain/asset';
import { PrivateKey, PublicKey } from '../chain/keys/keys';
import { KeyRole, KeyRoleActive, KeyRoleOwner, KeyRolePosting } from '../chain/keys/utils';
import {
    AccountUpdateOperation,
    ChangeRecoveryAccountOperation,
    ClaimAccountOperation,
    CommentOperation,
    CommentOptionsOperation,
    CreateClaimedAccountOperation,
    CustomJsonOperation,
    DelegateVestingSharesOperation,
    Operation,
    TransferOperation,
    VoteOperation,
} from '../chain/operation';
import { Client } from '../client';
import { generateUniqueNounce } from '../utils';

export interface CreateAccountOptions {
    /**
     * Username for the new account.
     */
    username: string;
    /**
     * Password for the new account, if set, all keys will be derived from this.
     */
    password?: string;
    /**
     * Account authorities, used to manually set account keys.
     * Can not be used together with the password option.
     */
    auths?: {
        owner: AuthorityType | string | PublicKey;
        active: AuthorityType | string | PublicKey;
        posting: AuthorityType | string | PublicKey;
        memoKey: PublicKey | string;
    };
    /**
     * Creator account, fee will be deducted from this and the key to sign
     * the transaction must be the creators active key.
     */
    creator: string;
    /**
     * Account creation fee. If omitted fee will be set to lowest possible.
     */
    fee?: string | Asset | number;
    /**
     * Account delegation, amount of VESTS to delegate to the new account.
     * If omitted the delegation amount will be the lowest possible based
     * on the fee. Can be set to zero to disable delegation.
     */
    delegation?: string | Asset | number;
    /**
     * Optional account meta-data.
     */
    metadata?: { [key: string]: any };
}

export interface CustomJsonOptions {
    id: string;
    json: Record<string, any> | unknown;
    account: string;
    role?: KeyRolePosting | KeyRoleActive;
    uniqueNounceKey?: string | null | false;
}

export interface UpdateAccountAuthorityThreshold {
    account: string;
    threshold: number;
    role: KeyRoleOwner | KeyRolePosting | KeyRoleActive;
}

export type AccountAuthorityType = 'key' | 'account';
export type UpdateAccountAuthorityMethod = 'add' | 'remove';

export interface UpdateAccountAuthorityOperation {
    method: UpdateAccountAuthorityMethod;
    account: string;
    authority: string;
    authorityType: AccountAuthorityType;
    role: KeyRole;
    weight?: number;
}

export interface DelegateRCOperation {
    from: string;
    to: string | string[];
    max_rc: string | RCAsset;
}

export class OperationAPI {
    constructor(readonly client: Client, private uniqueNounceKey?: string | null | false) {}

    public comment(data: CommentOperation[1]): CommentOperation {
        return ['comment', data];
    }

    public commentWithOptions(comment: CommentOperation[1], options: CommentOptionsOperation[1]): Operation[] {
        return [
            ['comment', comment],
            ['comment_options', options],
        ];
    }

    public vote(data: VoteOperation[1]): VoteOperation {
        return ['vote', data];
    }

    public transfer(data: TransferOperation[1]): TransferOperation {
        return ['transfer', data];
    }

    public customJson<ID = string, JSON = string>({
        id,
        account,
        json,
        role = 'posting',
        uniqueNounceKey = this.uniqueNounceKey,
    }: CustomJsonOptions): CustomJsonOperation<ID, JSON> {
        if (json && typeof json === 'object') {
            if (uniqueNounceKey && !json[uniqueNounceKey]) json[uniqueNounceKey] = generateUniqueNounce();
            json = JSON.stringify(json);
        }
        const opData = {
            id,
            json,
            required_auths: role === 'active' ? [account] : [],
            required_posting_auths: role == 'posting' ? [account] : [],
        };
        return ['custom_json', opData] as any;
    }

    public async createTestAccount(options: CreateAccountOptions): Promise<Operation[]> {
        assert(global.hasOwnProperty('it'), 'helper to be used only for mocha tests');

        const { username, metadata, creator } = options;

        const prefix = this.client.addressPrefix;
        let owner: Authority, active: Authority, posting: Authority, memo_key: PublicKey;
        if (options.password) {
            const ownerKey = PrivateKey.fromLogin(username, options.password, 'owner').createPublic(prefix);
            owner = Authority.from(ownerKey);
            const activeKey = PrivateKey.fromLogin(username, options.password, 'active').createPublic(prefix);
            active = Authority.from(activeKey);
            const postingKey = PrivateKey.fromLogin(username, options.password, 'posting').createPublic(prefix);
            posting = Authority.from(postingKey);
            memo_key = PrivateKey.fromLogin(username, options.password, 'memo').createPublic(prefix);
        } else if (options.auths) {
            owner = Authority.from(options.auths.owner);
            active = Authority.from(options.auths.active);
            posting = Authority.from(options.auths.posting);
            memo_key = PublicKey.from(options.auths.memoKey);
        } else {
            throw new Error('Must specify either password or auths');
        }

        let { fee, delegation } = options;

        delegation = Asset.from(delegation || 0, 'VESTS');
        fee = Asset.from(fee || 0, 'TESTS');

        if (fee.amount > 0) {
            const chainProps = await this.client.database.getChainProperties();
            const creationFee = Asset.from(chainProps.account_creation_fee);
            if (fee.amount !== creationFee.amount) {
                throw new Error('Fee must be exactly ' + creationFee.toString());
            }
        }

        const claim_op: ClaimAccountOperation = [
            'claim_account',
            {
                creator,
                extensions: [],
                fee,
            },
        ];

        const create_op: CreateClaimedAccountOperation = [
            'create_claimed_account',
            {
                active,
                creator,
                extensions: [],
                json_metadata: metadata ? JSON.stringify(metadata) : '',
                memo_key,
                new_account_name: username,
                owner,
                posting,
            },
        ];

        const ops: any[] = [claim_op, create_op];

        if (delegation.amount > 0) {
            const delegate_op: DelegateVestingSharesOperation = [
                'delegate_vesting_shares',
                {
                    delegatee: username,
                    delegator: creator,
                    vesting_shares: delegation,
                },
            ];
            ops.push(delegate_op);
        }

        return ops;
    }

    public updateAccount(data: AccountUpdateOperation[1]): AccountUpdateOperation {
        return ['account_update', data];
    }

    /**
     * Updates account authority and adds/removes specific account/key as [owner/active/posting] authority or sets memo-key
     */
    public async updateAccountAuthority({ method, account, authority, authorityType, role, weight = 1 }: UpdateAccountAuthorityOperation): Promise<AccountUpdateOperation> {
        const existingAccount = await this.client.database.getAccount(account, { logErrors: false });
        if (!existingAccount?.name) throw new Error('Account does not exists');

        const accountAuthority = existingAccount[role];
        const authorityKey = `${authorityType}_auths`;

        if (role !== 'memo') {
            if (method === 'remove') {
                accountAuthority[authorityKey] = accountAuthority[authorityKey].filter((k: [string, number]) => k[0] !== authority);
                if (authorityType === 'key' && accountAuthority[authorityKey].length < 1) throw new Error('Can not reduce authority keys to less than 1');
            } else {
                accountAuthority[authorityKey].push([authority, weight]);
                accountAuthority[authorityKey] = accountAuthority[authorityKey].sort((a: [string, number], b: [string, number]) => a[0].localeCompare(b[0]));
            }
        }

        const data: AccountUpdateOperation[1] = {
            account,
            json_metadata: existingAccount.json_metadata,
            memo_key: existingAccount.memo_key,
        };
        data[role] = role !== 'memo' ? accountAuthority : authority;
        return ['account_update', data];
    }

    public async updateAccountAuthorityThreshold({ account, threshold, role }: UpdateAccountAuthorityThreshold): Promise<AccountUpdateOperation> {
        const existingAccount = await this.client.database.getAccount(account, { logErrors: false });
        if (!existingAccount?.name) throw new Error('Account does not exists');

        const data: AccountUpdateOperation[1] = {
            account,
            json_metadata: JSON.stringify(existingAccount.json_metadata),
            memo_key: existingAccount.memo_key,
        };
        data[role] = { ...existingAccount[role], weight_threshold: threshold };
        return ['account_update', data];
    }

    public changeRecoveryAccount(data: ChangeRecoveryAccountOperation[1]): ChangeRecoveryAccountOperation {
        return ['change_recovery_account', data];
    }

    public delegateVestingShares(options: DelegateVestingSharesOperation[1]): DelegateVestingSharesOperation {
        return ['delegate_vesting_shares', options];
    }

    /**
     * Example
     * max_rc: '5 RC' or '5000000000 RCS' or RCAsset.from(5, 'RC')
     */
    public delegateRC({ from, to, max_rc }: DelegateRCOperation) {
        const data: { from: string; delegatees: string[]; max_rc: number } = {
            from,
            delegatees: Array.isArray(to) ? to : [to],
            max_rc: typeof max_rc === 'string' ? RCAsset.from(max_rc).toSatoshi().amount : max_rc.symbol === 'RCS' ? max_rc.amount : max_rc.toSatoshi().amount,
        };
        return this.customJson<'rc', string>({ id: 'rc', json: ['delegate_rc', data], account: from, role: 'posting' });
    }
}
