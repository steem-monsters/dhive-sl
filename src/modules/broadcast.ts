/**
 * @file Broadcast API helpers.
 * @author Johan Nordberg <code@johan-nordberg.com>
 * @license BSD-3-Clause-No-Military-License
 */

import assert from 'assert';
import { Authority, AuthorityType } from '../chain/account';
import { Asset } from '../chain/asset';
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
import { SignedTransaction, Transaction, TransactionConfirmation } from '../chain/transaction';
import { log } from '../utils';
import { Client } from '../client';
import { PrivateKey, PublicKey } from '../chain/keys/keys';
import { KeyRole } from '../chain/keys/utils';
import { BlockchainMode } from './blockchain';

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
    json: Record<string, any>;
    account: string;
    role?: 'active' | 'posting';
}

export interface UpdateAccountAuthorityThreshold {
    account: string;
    threshold: number;
    role: 'owner' | 'active' | 'posting';
    broadcastKey: string | PrivateKey | string[] | PrivateKey[];
}

export interface UpdateAccountAuthority {
    method: 'add' | 'remove';
    account: string;
    authority: string;
    authorityType: 'key' | 'account';
    role: KeyRole;
    weight?: number;
    broadcastKey: string | PrivateKey | string[] | PrivateKey[];
}

export class BroadcastAPI {
    /**
     * How many milliseconds in the future to set the expiry time to when
     * broadcasting a transaction, defaults to 1 minute.
     */
    public expireTime = 600 * 1000;

    constructor(readonly client: Client) {}

    /**
     * Broadcast a comment, also used to create a new top level post.
     * @param comment The comment/post.
     * @param key Private posting key of comment author.
     */
    public async comment(comment: CommentOperation[1], key: string | PrivateKey | string[] | PrivateKey[]) {
        const op: Operation = ['comment', comment];
        return this.sendOperations([op], key);
    }

    /**
     * Broadcast a comment and set the options.
     * @param comment The comment/post.
     * @param options The comment/post options.
     * @param key Private posting key of comment author.
     */
    public async commentWithOptions(comment: CommentOperation[1], options: CommentOptionsOperation[1], key: string | PrivateKey | string[] | PrivateKey[]) {
        const ops: Operation[] = [
            ['comment', comment],
            ['comment_options', options],
        ];
        return this.sendOperations(ops, key);
    }

    /**
     * Broadcast a vote.
     * @param vote The vote to send.
     * @param key Private posting key of the voter.
     */
    public async vote(vote: VoteOperation[1], key: string | PrivateKey | string[] | PrivateKey[]) {
        const op: Operation = ['vote', vote];
        return this.sendOperations([op], key);
    }

    /**
     * Broadcast a transfer.
     * @param data The transfer operation payload.
     * @param key Private active key of sender.
     */
    public async transfer(data: TransferOperation[1], key: string | PrivateKey | string[] | PrivateKey[]) {
        const op: Operation = ['transfer', data];
        return this.sendOperations([op], key);
    }

    /**
     * Broadcast custom JSON.
     * @param data The custom_json operation payload.
     * @param key Private posting or active key.
     */
    public async customJson(data: CustomJsonOptions, key: string | PrivateKey | string[] | PrivateKey[]) {
        const opData: CustomJsonOperation[1] = {
            id: data.id,
            json: JSON.stringify(data.json),
            required_auths: data.role === 'active' ? [data.account] : [],
            required_posting_auths: data.role === 'posting' ? [data.account] : [],
        };
        const op: Operation = ['custom_json', opData];
        return this.sendOperations([op], key);
    }

    public async customJsonQueue(data: CustomJsonOptions, key: string | PrivateKey | string[] | PrivateKey[]) {
        return new Promise((resolve, reject) => {
            this.client.queueTransaction(data, key, (data: CustomJsonOptions, key: string | PrivateKey | string[] | PrivateKey[]) =>
                this.customJson(data, key)
                    .then((r) => {
                        log(`Custom JSON [${data.id}] broadcast successfully - Tx: [${r.id}].`, 3);
                        resolve(r);
                    })
                    .catch(async (e) => {
                        log(`Error broadcasting custom_json [${data.id}]. Error: ${e}`, 1, 'Red');
                        reject(e);
                    }),
            );
        });
    }

    /**
     * Create a new account on testnet.
     * @param options New account options.
     * @param key Private active key of account creator.
     */
    public async createTestAccount(options: CreateAccountOptions, key: string | PrivateKey | string[] | PrivateKey[]) {
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

        return this.sendOperations(ops, key);
    }

    /**
     * Update account.
     * @param data The account_update payload.
     * @param key The private key of the account affected, should be the corresponding
     *            key level or higher for updating account authorities.
     */
    public async updateAccount(data: AccountUpdateOperation[1], key: string | PrivateKey | string[] | PrivateKey[]) {
        const op: Operation = ['account_update', data];
        return this.sendOperations([op], key);
    }

    /**
     * Updates account authority and adds/removes specific account/key as [owner/active/posting] authority or sets memo-key
     */
    public async updateAccountAuthority({ method, account, authority, authorityType, role, weight = 1, broadcastKey }: UpdateAccountAuthority) {
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
            json_metadata: JSON.stringify(existingAccount.json_metadata),
            memo_key: existingAccount.memo_key,
        };
        data[role] = role !== 'memo' ? accountAuthority : authority;

        return this.updateAccount(data, broadcastKey);
    }

    /**
     * Changes authority threshold. Default is at 1. This changes how many keys/account authorities you need to successfuly sign & broadcast a transaction
     */
    public async updateAccountAuthorityThreshold({ account, threshold, role, broadcastKey }: UpdateAccountAuthorityThreshold) {
        const existingAccount = await this.client.database.getAccount(account, { logErrors: false });
        if (!existingAccount?.name) throw new Error('Account does not exists');

        const data: AccountUpdateOperation[1] = {
            account,
            json_metadata: JSON.stringify(existingAccount.json_metadata),
            memo_key: existingAccount.memo_key,
        };
        data[role] = { ...existingAccount[role], weight_threshold: threshold };

        return this.updateAccount(data, broadcastKey);
    }

    /**
     * Start account recovery request. Requires private owner key of account to recover.
     */
    public changeRecoveryAccount(data: ChangeRecoveryAccountOperation[1], ownerKey: string | PrivateKey | string[] | PrivateKey[]) {
        const op: Operation = ['change_recovery_account', data];
        return this.sendOperations([op], ownerKey);
    }

    /**
     * Delegate vesting shares from one account to the other. The vesting shares are still owned
     * by the original account, but content voting rights and bandwidth allocation are transferred
     * to the receiving account. This sets the delegation to `vesting_shares`, increasing it or
     * decreasing it as needed. (i.e. a delegation of 0 removes the delegation)
     *
     * When a delegation is removed the shares are placed in limbo for a week to prevent a satoshi
     * of VESTS from voting on the same content twice.
     *
     * @param options Delegation options.
     * @param key Private active key of the delegator.
     */
    public async delegateVestingShares(options: DelegateVestingSharesOperation[1], key: string | PrivateKey | string[] | PrivateKey[]) {
        const op: Operation = ['delegate_vesting_shares', options];
        return this.sendOperations([op], key);
    }

    /**
     * Sign and broadcast transaction with operations to the network. Throws if the transaction expires.
     * @param ops List of operations to send.
     * @param key Private key(s) used to sign transaction.
     */
    public async sendOperations(
        ops: Operation[],
        key: string | string[] | PrivateKey | PrivateKey[],
        mode: BlockchainMode = this.client.blockchainMode,
    ): Promise<TransactionConfirmation> {
        const tx = await this.createTransaction(ops, mode);
        const signedTx = this.sign(tx, key);
        const result = await this.send(signedTx);
        // assert(result.expired === false, 'transaction expired');
        return result;
    }

    /**
     * Creates & prepares transaction for signing & broadcasting
     * @param ops List of operations for transaction
     * @param mode BlockchainMode - default: irreversible
     */
    public async createTransaction(ops: Operation[], mode: BlockchainMode = this.client.blockchainMode) {
        const txSignProperties = await this.client.database.getTxSignProperties();
        return Transaction.from(txSignProperties, ops, mode);
    }

    /**
     * Signs transaction for broadcasting
     * @param transaction Prepared transaction (i.e. via createTransaction)
     * @param key Private key(s) used to sign transaction.
     */
    public sign(transaction: Transaction, key: string | string[] | PrivateKey | PrivateKey[]): SignedTransaction {
        return transaction.sign(key, this.client.chainId);
    }

    /**
     * Broadcast a signed transaction to the network.
     */
    public async send(transaction: SignedTransaction): Promise<TransactionConfirmation> {
        const trxId = transaction.generateTrxId();
        const result = await this.call('broadcast_transaction', [transaction]);
        return { ...result, id: trxId };
    }

    /**
     * Convenience for calling `condenser_api`.
     */
    public call(method: string, params?: any[]) {
        return this.client.call('condenser_api', method, params);
    }
}
