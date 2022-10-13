/**
 * @file Transaction types
 * @author Johan Nordberg <code@johan-nordberg.com>
 * @license BSD-3-Clause-No-Military-License
 */

import { Operation } from './operation';
import ByteBuffer from 'bytebuffer';
import { VError } from 'verror';
import { Types } from './serializer';
import { PrivateKey, Signature } from './keys/keys';
import { hash } from '../crypto';
import { DEFAULT_CHAIN_ID } from '../constants';
import { TxSignProperties } from '../modules/database';

interface TransactionParameters {
    ref_block_num: number;
    ref_block_prefix: number;
    expiration: string;
    operations: Operation[];
    extensions: any[];
}

interface SignedTransactionParameters extends TransactionParameters {
    signatures: string[];
}

interface SignedBlockTransactionParameters extends SignedTransactionParameters {
    transaction_id: string;
    block_num: number;
    transaction_num: number;
}

export interface TransactionConfirmation {
    id: string; // transaction_id_type
    block_num: number; // int32_t
    trx_num: number; // int32_t
    expired: boolean;
}

export class Transaction {
    /**
     * How many milliseconds in the future to set the expiry time to when
     * broadcasting a transaction, defaults to 10 minutes.
     */
    public static expireTime = 600 * 1000;

    public ref_block_num: TransactionParameters['ref_block_num'];
    public ref_block_prefix: TransactionParameters['ref_block_prefix'];
    public expiration: TransactionParameters['expiration'];
    public operations: TransactionParameters['operations'];
    public extensions: TransactionParameters['extensions'];

    constructor({ ref_block_num, ref_block_prefix, expiration, operations, extensions }: TransactionParameters) {
        this.ref_block_num = ref_block_num;
        this.ref_block_prefix = ref_block_prefix;
        this.expiration = expiration;
        this.operations = operations;
        this.extensions = extensions;
    }

    /**
     *
     * @param txSignProperties txSignProperties via client.database.getTxSignProperties()
     * @param ops operations
     */
    public static from(txSignProperties: TxSignProperties, ops: Operation[], expireTime = Transaction.expireTime) {
        const ref_block_num = txSignProperties.head_block_number & 0xffff;
        const ref_block_prefix = Buffer.from(txSignProperties.head_block_id, 'hex').readUInt32LE(4);
        const expiration = new Date(txSignProperties.time + expireTime).toISOString().slice(0, -5);

        return new Transaction({
            ref_block_num,
            ref_block_prefix,
            expiration,
            extensions: [],
            operations: ops,
        });
    }

    /**
     * Returns the public key a signature was signed with
     */
    public recoverKeyFromSignature(signature: string, chainId?: Buffer) {
        try {
            const sig = Signature.fromString(signature);
            return new Signature(sig.data, sig.recid).recover(this.digest(chainId));
        } catch (e: any) {
            return null;
        }
    }

    /**
     * Return the sha256 transaction digest.
     * @param chainId The chain id to use when creating the hash.
     */
    public digest(chainId: Buffer = DEFAULT_CHAIN_ID) {
        const buffer: any = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
        try {
            Types.Transaction(buffer, this);
        } catch (cause) {
            throw new VError({ cause, name: 'SerializationError' }, 'Unable to serialize transaction');
        }
        buffer.flip();

        const transactionData = Buffer.from(buffer.toBuffer());
        const digest = hash.sha256(Buffer.concat([chainId, transactionData]));
        return digest;
    }

    /**
     * Return copy of transaction with signature appended to signatures array.
     * @param transaction Transaction to sign.
     * @param keys Key(s) to sign transaction with.
     * @param options Chain id and address prefix, compatible with Client
     */
    public sign(keys: string | string[] | PrivateKey | PrivateKey[], chainId: Buffer = DEFAULT_CHAIN_ID) {
        const digest = this.digest(chainId);
        const signedTransaction = new SignedTransaction({ signatures: [], ...this });
        const finalKeys: PrivateKey[] = (!Array.isArray(keys) ? [keys] : keys).map((key) => (typeof key === 'string' ? PrivateKey.from(key) : key));

        for (const key of finalKeys) {
            const signature = key.sign(digest);
            signedTransaction.signatures.push(signature.toString());
        }

        return signedTransaction;
    }

    generateTrxId() {
        const buffer: any = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
        try {
            Types.Transaction(buffer, this);
        } catch (cause) {
            throw new VError({ cause, name: 'SerializationError' }, 'Unable to serialize transaction');
        }
        buffer.flip();
        const transactionData = Buffer.from(buffer.toBuffer());
        return hash.sha256(transactionData).toString('hex').slice(0, 40);
    }
}

export class SignedTransaction extends Transaction {
    public signatures: SignedTransactionParameters['signatures'];

    constructor({ ref_block_num, ref_block_prefix, expiration, operations, extensions, signatures }: SignedTransactionParameters) {
        super({ ref_block_num, ref_block_prefix, expiration, operations, extensions });
        this.signatures = signatures;
    }
}

export class SignedTransactionInBlock extends SignedTransaction {
    public block_num: SignedBlockTransactionParameters['block_num'];
    public transaction_id: SignedBlockTransactionParameters['transaction_id'];
    public transaction_num: SignedBlockTransactionParameters['transaction_num'];

    constructor({ ref_block_num, ref_block_prefix, expiration, operations, extensions, signatures, block_num, transaction_id, transaction_num }: SignedBlockTransactionParameters) {
        super({ ref_block_num, ref_block_prefix, expiration, operations, extensions, signatures });
        this.block_num = block_num;
        this.transaction_id = transaction_id;
        this.transaction_num = transaction_num;
    }
}
