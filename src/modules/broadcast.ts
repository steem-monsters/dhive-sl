/**
 * @file Broadcast API helpers.
 * @author Johan Nordberg <code@johan-nordberg.com>
 * @license BSD-3-Clause-No-Military-License
 */

import {
    AccountUpdateOperation,
    ChangeRecoveryAccountOperation,
    CommentOperation,
    CommentOptionsOperation,
    DelegateVestingSharesOperation,
    Operation,
    TransferOperation,
    VoteOperation,
} from '../chain/operation';
import { SignedTransaction, Transaction, TransactionConfirmation } from '../chain/transaction';
import { log } from '../utils';
import { Client } from '../client';
import { PrivateKey } from '../chain/keys/keys';
import { CreateAccountOptions, CustomJsonOptions, DelegateRCOperation, UpdateAccountAuthorityOperation, UpdateAccountAuthorityThreshold } from './operation';

export class BroadcastAPI {
    /**
     * How many milliseconds in the future to set the expiry time to when
     * broadcasting a transaction, defaults to 10 minutes.
     */
    public expireTime = 600 * 1000;

    constructor(readonly client: Client) {}

    /**
     * Broadcast a comment, also used to create a new top level post.
     * @param data The comment/post.
     * @param key Private posting key of comment author.
     */
    public async comment(data: CommentOperation[1], key: string | string[] | PrivateKey | PrivateKey[]) {
        const op = this.client.operation.comment(data);
        return this.sendOperations([op], key);
    }

    /**
     * Broadcast a comment and set the options.
     * @param data The comment/post.
     * @param options The comment/post options.
     * @param key Private posting key of comment author.
     */
    public async commentWithOptions(data: CommentOperation[1], options: CommentOptionsOperation[1], key: string | string[] | PrivateKey | PrivateKey[]) {
        const ops = this.client.operation.commentWithOptions(data, options);
        return this.sendOperations(ops, key);
    }

    /**
     * Broadcast a vote.
     * @param data The vote to send.
     * @param key Private posting key of the voter.
     */
    public async vote(data: VoteOperation[1], key: string | string[] | PrivateKey | PrivateKey[]) {
        const op = this.client.operation.vote(data);
        return this.sendOperations([op], key);
    }

    /**
     * Broadcast a transfer.
     * @param data The transfer operation payload.
     * @param key Private active key of sender.
     */
    public async transfer(data: TransferOperation[1], key: string | string[] | PrivateKey | PrivateKey[]) {
        const op = this.client.operation.transfer(data);
        return this.sendOperations([op], key);
    }

    /**
     * Broadcast custom JSON.
     * @param data The custom_json operation payload.
     * @param key Private posting or active key.
     */
    public async customJson(data: CustomJsonOptions, key: string | string[] | PrivateKey | PrivateKey[]) {
        const op = this.client.operation.customJson(data);
        return this.sendOperations([op], key);
    }

    public async customJsonQueue(data: CustomJsonOptions, key: string | string[] | PrivateKey | PrivateKey[]) {
        return new Promise((resolve, reject) => {
            this.client.queueTransaction(data, key, (data: CustomJsonOptions, key: string | string[] | PrivateKey | PrivateKey[]) =>
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
    public async createTestAccount(options: CreateAccountOptions, key: string | string[] | PrivateKey | PrivateKey[]) {
        const ops = await this.client.operation.createTestAccount(options);
        return this.sendOperations(ops, key);
    }

    /**
     * Update account.
     * @param data The account_update payload.
     * @param key The private key of the account affected, should be the corresponding
     *            key level or higher for updating account authorities.
     */
    public async updateAccount(data: AccountUpdateOperation[1], key: string | string[] | PrivateKey | PrivateKey[]) {
        const op = this.client.operation.updateAccount(data);
        return this.sendOperations([op], key);
    }

    /**
     * Updates account authority and adds/removes specific account/key as [owner/active/posting] authority or sets memo-key
     */
    public async updateAccountAuthority(data: UpdateAccountAuthorityOperation, key: string | string[] | PrivateKey | PrivateKey[]) {
        const op = await this.client.operation.updateAccountAuthority(data);
        return this.sendOperations([op], key);
    }

    /**
     * Changes authority threshold. Default is at 1. This changes how many keys/account authorities you need to successfuly sign & broadcast a transaction
     */
    public async updateAccountAuthorityThreshold(data: UpdateAccountAuthorityThreshold, key: string | string[] | PrivateKey | PrivateKey[]) {
        const op = await this.client.operation.updateAccountAuthorityThreshold(data);
        return this.sendOperations([op], key);
    }

    /**
     * Start account recovery request. Requires private owner key of account to recover.
     */
    public changeRecoveryAccount(data: ChangeRecoveryAccountOperation[1], ownerKey: string | PrivateKey | string[] | PrivateKey[]) {
        const op = this.client.operation.changeRecoveryAccount(data);
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
     * @param data Delegation options.
     * @param key Private active key of the delegator.
     */
    public async delegateVestingShares(data: DelegateVestingSharesOperation[1], key: string | string[] | PrivateKey | PrivateKey[]) {
        const op = this.client.operation.delegateVestingShares(data);
        return this.sendOperations([op], key);
    }

    public async delegateRC(data: DelegateRCOperation, key: string | string[] | PrivateKey | PrivateKey[]) {
        const op = this.client.operation.delegateRC(data);
        return this.sendOperations([op], key);
    }

    /**
     * Sign and broadcast transaction with operations to the network. Throws if the transaction expires.
     * @param ops List of operations to send.
     * @param key Private key(s) used to sign transaction.
     */
    public async sendOperations(ops: Operation[], key: string | string[] | PrivateKey | PrivateKey[]) {
        const tx = await this.createTransaction(ops);
        const signedTx = this.sign(tx, key);
        return this.send(signedTx);
        // assert(result.expired === false, 'transaction expired');
    }

    /**
     * Creates, prepares & signs transaction for broadcasting
     * @param op One or more operation for transaction
     */
    public async createSignedTransaction(op: Operation | Operation[], key: string | string[] | PrivateKey | PrivateKey[]) {
        const transaction = await this.createTransaction(op);
        return this.sign(transaction, key);
    }

    /**
     * Creates & prepares transaction for signing & broadcasting
     * @param op One or more operation for transaction
     */
    public async createTransaction(op: Operation | Operation[]) {
        const ops = (typeof op[0] === 'string' ? [op] : op) as Operation[];
        const txSignProperties = await this.client.database.getTxSignProperties();
        return Transaction.from(txSignProperties, ops, this.client.blockchainMode);
    }

    /**
     * Signs transaction for broadcasting
     * @param transaction Prepared transaction (i.e. via createTransaction)
     * @param key Private key(s) used to sign transaction.
     */
    public sign(transaction: Transaction, key: string | string[] | PrivateKey | PrivateKey[]): SignedTransaction {
        const tx = transaction instanceof Transaction ? transaction : new Transaction(transaction);
        return tx.sign(key, this.client.chainId);
    }

    /**
     * Broadcast a signed transaction to the network.
     */
    public async send(signedTransaction: SignedTransaction): Promise<TransactionConfirmation> {
        const signedTx = signedTransaction instanceof SignedTransaction ? signedTransaction : new SignedTransaction(signedTransaction);
        const trxId = signedTx.generateTrxId();
        const result = await this.call('broadcast_transaction', [signedTx]);
        return { ...result, id: trxId };
    }

    /**
     * Convenience for calling `condenser_api`.
     */
    public call(method: string, params?: any[]) {
        return this.client.call('condenser_api', method, params);
    }
}
