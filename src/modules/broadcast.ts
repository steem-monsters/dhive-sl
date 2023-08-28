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
import { ClientFetch } from '../clientFetch';
import { CreateAccountOptions, CustomJsonOptions, DelegateRCOperation, OperationAPI, UpdateAccountAuthorityOperation, UpdateAccountAuthorityThreshold } from './operation';
import { DatabaseAPI } from './database';
import { LogLevel, log } from '../utils/utils';
import { PrivateKey, PrivateKeyArg } from '../chain/keys';
import { SignedTransaction, Transaction, TransactionConfirmation } from '../chain/transaction';
import { TransactionQueue } from '../utils/transactionQueue';

export class BroadcastAPI {
    constructor(
        private readonly fetch: ClientFetch,
        private readonly operations: OperationAPI,
        private readonly database: DatabaseAPI,
        private readonly transactionQueue: TransactionQueue,
        private readonly chainId: Uint8Array,
    ) {}

    /**
     * Broadcast a comment, also used to create a new top level post.
     * @param data The comment/post.
     * @param key Private posting key of comment author.
     */
    public async comment(data: CommentOperation[1], key: PrivateKeyArg) {
        const op = this.operations.comment(data);
        return this.sendOperations([op], key);
    }

    /**
     * Broadcast a comment and set the options.
     * @param data The comment/post.
     * @param options The comment/post options.
     * @param key Private posting key of comment author.
     */
    public async commentWithOptions(data: CommentOperation[1], options: CommentOptionsOperation[1], key: PrivateKeyArg) {
        const ops = this.operations.commentWithOptions(data, options);
        return this.sendOperations(ops, key);
    }

    /**
     * Broadcast a vote.
     * @param data The vote to send.
     * @param key Private posting key of the voter.
     */
    public async vote(data: VoteOperation[1], key: PrivateKeyArg) {
        const op = this.operations.vote(data);
        return this.sendOperations([op], key);
    }

    /**
     * Broadcast a transfer.
     * @param data The transfer operation payload.
     * @param key Private active key of sender.
     */
    public async transfer(data: TransferOperation[1], key: PrivateKeyArg) {
        const op = this.operations.transfer(data);
        return this.sendOperations([op], key);
    }

    /**
     * Broadcast custom JSON.
     * @param data The custom_json operation payload.
     * @param key Private posting or active key.
     */
    public async customJson(data: CustomJsonOptions, key: PrivateKeyArg) {
        const op = this.operations.customJson(data);
        return this.sendOperations([op], key);
    }

    public async customJsonQueue(data: CustomJsonOptions, key: PrivateKeyArg): Promise<TransactionConfirmation> {
        return new Promise((resolve, reject) => {
            this.transactionQueue.queueTransaction(data, key, (data: CustomJsonOptions, key: PrivateKeyArg) =>
                this.customJson(data, key)
                    .then((r) => {
                        log(`Custom JSON [${data.id}] broadcast successfully - Tx: [${r.id}].`, LogLevel.Debug);
                        resolve(r);
                    })
                    .catch(async (e) => {
                        log(`Error broadcasting custom_json [${data.id}]. Error: ${e}`, LogLevel.Error, 'Red');
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
    public async createTestAccount(options: CreateAccountOptions, key: PrivateKeyArg) {
        const ops = await this.operations.createTestAccount(options);
        return this.sendOperations(ops, key);
    }

    /**
     * Update account.
     * @param data The account_update payload.
     * @param key The private key of the account affected, should be the corresponding
     *            key level or higher for updating account authorities.
     */
    public async updateAccount(data: AccountUpdateOperation[1], key: PrivateKeyArg) {
        const op = this.operations.updateAccount(data);
        return this.sendOperations([op], key);
    }

    /**
     * Updates account authority and adds/removes specific account/key as [owner/active/posting] authority or sets memo-key
     */
    public async updateAccountAuthority(data: UpdateAccountAuthorityOperation, key: PrivateKeyArg) {
        const op = await this.operations.updateAccountAuthority(data);
        return this.sendOperations([op], key);
    }

    /**
     * Changes authority threshold. Default is at 1. This changes how many keys/account authorities you need to successfuly sign & broadcast a transaction
     */
    public async updateAccountAuthorityThreshold(data: UpdateAccountAuthorityThreshold, key: PrivateKeyArg) {
        const op = await this.operations.updateAccountAuthorityThreshold(data);
        return this.sendOperations([op], key);
    }

    /**
     * Start account recovery request. Requires private owner key of account to recover.
     */
    public changeRecoveryAccount(data: ChangeRecoveryAccountOperation[1], ownerKey: string | PrivateKey | string[] | PrivateKey[]) {
        const op = this.operations.changeRecoveryAccount(data);
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
    public async delegateVestingShares(data: DelegateVestingSharesOperation[1], key: PrivateKeyArg) {
        const op = this.operations.delegateVestingShares(data);
        return this.sendOperations([op], key);
    }

    /**
     * Delegates RC by either using RC or RCS (Resource Credits Satoshis).
     *
     * 1 RC = 1,000,000,000 RCS
     *
     * Example for max_rc: '5 RC' or '5000000000 RCS' or RCAsset.from(5, 'RC')
     */
    public async delegateRC(data: DelegateRCOperation, key: PrivateKeyArg) {
        const op = this.operations.delegateRC(data);
        return this.sendOperations([op], key);
    }

    /**
     * Sign and broadcast transaction with operations to the network. Throws if the transaction expires.
     * @param ops List of operations to send.
     * @param key Private key(s) used to sign transaction.
     */
    public async sendOperations(ops: Operation[], key: PrivateKeyArg) {
        const tx = await this.createTransaction(ops);
        const signedTx = this.sign(tx, key);
        return this.send(signedTx);
    }

    /**
     * Creates & prepares transaction for signing & broadcasting
     * @param op One or more operation for transaction
     */
    public async createTransaction(op: Operation | Operation[]) {
        const ops = (typeof op[0] === 'string' ? [op] : op) as Operation[];
        const txSignProperties = await this.database.getTxSignProperties();
        return Transaction.from(txSignProperties, ops);
    }

    /**
     * Creates, prepares & signs transaction for broadcasting
     * @param op One or more operation for transaction
     */
    public async createSignedTransaction(op: Operation | Operation[], key: PrivateKeyArg) {
        const transaction = await this.createTransaction(op);
        return this.sign(transaction, key);
    }

    /**
     * Signs transaction for broadcasting
     * @param transaction Prepared transaction (i.e. via createTransaction)
     * @param key Private key(s) used to sign transaction.
     */
    public sign(transaction: Transaction, key: PrivateKeyArg): SignedTransaction {
        const tx = transaction instanceof Transaction ? transaction : new Transaction(transaction);
        return tx.sign(key, this.chainId);
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
        return this.fetch.call(`condenser_api.${method}`, params);
    }
}
