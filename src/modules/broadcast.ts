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
import { PrivateKey, PublicKey } from '../chain/keys';
import { KeyRole } from '../chain/keys/utils';

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
    json: any;
    account: string;
    activeAuth?: boolean;
}

export class BroadcastAPI {
    /**
     * How many milliseconds in the future to set the expiry time to when
     * broadcasting a transaction, defaults to 1 minute.
     */
    public expireTime = 60 * 1000;

    constructor(readonly client: Client) {}

    /**
     * Broadcast a comment, also used to create a new top level post.
     * @param comment The comment/post.
     * @param key Private posting key of comment author.
     */
    public async comment(comment: CommentOperation[1], key: string | PrivateKey) {
        const op: Operation = ['comment', comment];
        return this.sendOperations([op], key);
    }

    /**
     * Broadcast a comment and set the options.
     * @param comment The comment/post.
     * @param options The comment/post options.
     * @param key Private posting key of comment author.
     */
    public async commentWithOptions(comment: CommentOperation[1], options: CommentOptionsOperation[1], key: string | PrivateKey) {
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
    public async vote(vote: VoteOperation[1], key: string | PrivateKey) {
        const op: Operation = ['vote', vote];
        return this.sendOperations([op], key);
    }

    /**
     * Broadcast a transfer.
     * @param data The transfer operation payload.
     * @param key Private active key of sender.
     */
    public async transfer(data: TransferOperation[1], key: string | PrivateKey) {
        const op: Operation = ['transfer', data];
        return this.sendOperations([op], key);
    }

    /**
     * Broadcast custom JSON.
     * @param data The custom_json operation payload.
     * @param key Private posting or active key.
     */
    public async customJson(data: CustomJsonOptions, key: string | PrivateKey) {
        const opData: CustomJsonOperation[1] = {
            id: data.id,
            json: JSON.stringify(data.json),
            required_auths: data.activeAuth ? [data.account] : [],
            required_posting_auths: data.activeAuth ? [] : [data.account],
        };
        const op: Operation = ['custom_json', opData];
        return this.sendOperations([op], key);
    }

    public async customJsonQueue(data: CustomJsonOptions, key: string | PrivateKey) {
        return new Promise((resolve, reject) => {
            this.client.queueTransaction(data, key, (data: CustomJsonOptions, key: string | PrivateKey) =>
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
    public async createTestAccount(options: CreateAccountOptions, key: string | PrivateKey) {
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
    public async updateAccount(data: AccountUpdateOperation[1], key: string | PrivateKey) {
        const op: Operation = ['account_update', data];
        return this.sendOperations([op], key);
    }

    /**
     * Adds/removes a [active/posting/memo/owner] key to/from a given hive account
     */
    public async updateAccountKeys(name: string, type: KeyRole, method: 'add' | 'remove', publicKey: string, broadcastKey: string) {
        const account = await this.client.database.getAccount(name, { logErrors: false });
        if (!account) return { status: 'error', message: 'Account does not exists' };

        const authority = account[type];
        if (type !== 'memo') {
            if (method === 'remove') {
                authority.key_auths = authority.key_auths.filter((k: [string, number]) => k[0] !== publicKey);
                if (authority.key_auths.length < 1) return { status: 'error', message: `Can't reduce keys to less than 1` };
            } else {
                authority.key_auths.push([publicKey, 1]);
                authority.key_auths = authority.key_auths.sort((a: [string, number], b: [string, number]) => a[0].localeCompare(b[0]));
            }
        }

        const op: AccountUpdateOperation = [
            'account_update',
            { account: name, json_metadata: JSON.stringify(account.json_metadata), memo_key: account.memo_key, active: account.active, posting: account.posting },
        ];

        op[type] = type !== 'memo' ? authority : publicKey;

        const result = await this.sendOperations([op], broadcastKey);
        return result?.id ? { status: 'success', data: result } : { status: 'error', message: 'broadcast api error', data: result };
    }

    /**
     * Start account recovery request. Requires private owner key of account to recover.
     */
    public changeRecoveryAccount(data: ChangeRecoveryAccountOperation[1], ownerKey: string | PrivateKey) {
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
    public async delegateVestingShares(options: DelegateVestingSharesOperation[1], key: string | PrivateKey) {
        const op: Operation = ['delegate_vesting_shares', options];
        return this.sendOperations([op], key);
    }

    /**
     * Sign and broadcast transaction with operations to the network. Throws if the transaction expires.
     * @param operations List of operations to send.
     * @param key Private key(s) used to sign transaction.
     */
    public async sendOperations(operations: Operation[], key: string | string[] | PrivateKey | PrivateKey[]): Promise<TransactionConfirmation> {
        const props = await this.client.database.getDynamicGlobalProperties();

        const ref_block_num = props.head_block_number & 0xffff;
        const ref_block_prefix = Buffer.from(props.head_block_id, 'hex').readUInt32LE(4);
        const expiration = new Date(new Date(props.time + 'Z').getTime() + this.expireTime).toISOString().slice(0, -5);
        const extensions = [];

        const tx = new Transaction({
            expiration,
            extensions,
            operations,
            ref_block_num,
            ref_block_prefix,
        });

        const result = await this.send(this.sign(tx, key));
        // assert(result.expired === false, 'transaction expired')

        return result;
    }

    /**
     * Sign a transaction with key(s).
     */
    public sign(transaction: Transaction, key: string | string[] | PrivateKey | PrivateKey[]): SignedTransaction {
        return transaction.sign(key, this.client.chainId);
    }

    /**
     * Sign a transaction with key (Custom function by Splinterlands)
     */
    public async signCustom(tx: Transaction, key: string | string[] | PrivateKey | PrivateKey[]) {
        const chainProps = await this.client.database.getTxSignProperties();

        const preparedTx: Transaction = Object.assign(
            {
                ref_block_num: chainProps.ref_block_num & 0xffff,
                ref_block_prefix: chainProps.ref_block_prefix,
                expiration: new Date(chainProps.time.getTime() + 600 * 1000).toISOString().split('.')[0],
                extensions: [],
            },
            tx,
        );

        const signedTx = this.client.broadcast.sign(preparedTx, key);
        return signedTx;
    }

    /**
     * Broadcast a signed transaction to the network.
     */
    public async send(transaction: SignedTransaction): Promise<TransactionConfirmation> {
        const trxId = transaction.generateTrxId();
        const result = await this.call('broadcast_transaction', [transaction]);
        return Object.assign({ id: trxId }, result);
    }

    /**
     * Convenience for calling `condenser_api`.
     */
    public call(method: string, params?: any[]) {
        return this.client.call('condenser_api', method, params);
    }
}
