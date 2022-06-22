import assert from 'assert';
import * as bs58 from 'bs58';
import * as ByteBuffer from 'bytebuffer';
import { createHash } from 'crypto';
import * as secp256k1 from 'secp256k1';
import { VError } from 'verror';
import { Types } from './chain/serializer';
import { SignedTransaction, Transaction } from './chain/transaction';
import { DEFAULT_ADDRESS_PREFIX, DEFAULT_CHAIN_ID } from './client';
import { copy } from './utils';

/**
 * Network id used in WIF-encoding.
 */
export const NETWORK_ID = Buffer.from([0x80]);

/**
 * Return ripemd160 hash of input.
 */
function ripemd160(input: Buffer | string): Buffer {
    return createHash('ripemd160').update(input).digest();
}

/**
 * Return sha256 hash of input.
 */
function sha256(input: Buffer | string): Buffer {
    return createHash('sha256').update(input).digest();
}

/**
 * Return 2-round sha256 hash of input.
 */
function doubleSha256(input: Buffer | string): Buffer {
    return sha256(sha256(input));
}

/**
 * Encode public key with bs58+ripemd160-checksum.
 */
function encodePublic(key: Buffer, prefix: string): string {
    const checksum = ripemd160(key);
    return prefix + bs58.encode(Buffer.concat([key, checksum.slice(0, 4)]));
}

/**
 * Decode bs58+ripemd160-checksum encoded public key.
 */
function decodePublic(encodedKey: string): { key: Buffer; prefix: string } {
    const prefix = encodedKey.slice(0, 3);
    assert.equal(prefix.length, 3, 'public key invalid prefix');
    encodedKey = encodedKey.slice(3);
    const buffer: any = bs58.decode(encodedKey);
    const checksum = buffer.slice(-4);
    const key = buffer.slice(0, -4);
    const checksumVerify = ripemd160(key).slice(0, 4);
    assert.deepEqual(checksumVerify, checksum, 'public key checksum mismatch');
    return { key, prefix };
}

/**
 * Encode bs58+doubleSha256-checksum private key.
 */
function encodePrivate(key: Buffer): string {
    assert.equal(key.readUInt8(0), 0x80, 'private key network id mismatch');
    const checksum = doubleSha256(key);
    return bs58.encode(Buffer.concat([key, checksum.slice(0, 4)]));
}

/**
 * Decode bs58+doubleSha256-checksum encoded private key.
 */
function decodePrivate(encodedKey: string): Buffer {
    const buffer: any = bs58.decode(encodedKey);
    assert.deepEqual(buffer.slice(0, 1), NETWORK_ID, 'private key network id mismatch');
    const checksum = buffer.slice(-4);
    const key = buffer.slice(0, -4);
    const checksumVerify = doubleSha256(key).slice(0, 4);
    assert.deepEqual(checksumVerify, checksum, 'private key checksum mismatch');
    return key;
}

/**
 * Return true if signature is canonical, otherwise false.
 */
function isCanonicalSignature(signature: Buffer): boolean {
    return !(signature[0] & 0x80) && !(signature[0] === 0 && !(signature[1] & 0x80)) && !(signature[32] & 0x80) && !(signature[32] === 0 && !(signature[33] & 0x80));
}

/**
 * Return true if string is wif, otherwise false.
 */
function isWif(privWif: string | Buffer): boolean {
    try {
        const bufWif = new Buffer(bs58.decode(privWif as any));
        const privKey = bufWif.slice(0, -4);
        const checksum = bufWif.slice(-4);
        let newChecksum = sha256(privKey);
        newChecksum = sha256(newChecksum);
        newChecksum = newChecksum.slice(0, 4);
        return checksum.toString() === newChecksum.toString();
    } catch (e) {
        return false;
    }
}

/**
 * ECDSA (secp256k1) public key.
 */
export class PublicKey {
    constructor(public readonly key: Buffer, public readonly prefix = DEFAULT_ADDRESS_PREFIX) {
        assert(secp256k1.publicKeyVerify(key), 'invalid public key');
    }

    /**
     * Create a new instance from a WIF-encoded key.
     */
    public static fromString(wif: string) {
        const { key, prefix } = decodePublic(wif);
        return new PublicKey(key, prefix);
    }

    /**
     * Create a new instance.
     */
    public static from(value: string | PublicKey) {
        if (value instanceof PublicKey) {
            return value;
        } else {
            return PublicKey.fromString(value);
        }
    }

    /**
     * Verify a 32-byte signature.
     * @param message 32-byte message to verify.
     * @param signature Signature to verify.
     */
    public verify(message: Buffer, signature: Signature): boolean {
        return secp256k1.verify(message, signature.data, this.key);
    }

    /**
     * Return a WIF-encoded representation of the key.
     */
    public toString() {
        return encodePublic(this.key, this.prefix);
    }

    /**
     * Return JSON representation of this key, same as toString().
     */
    public toJSON() {
        return this.toString();
    }

    /**
     * Used by `utils.inspect` and `console.log` in node.js.
     */
    public inspect() {
        return `PublicKey: ${this.toString()}`;
    }
}

export type KeyRole = 'owner' | 'active' | 'posting' | 'memo';

/**
 * ECDSA (secp256k1) private key.
 */
export class PrivateKey {
    constructor(private key: Buffer) {
        assert(secp256k1.privateKeyVerify(key), 'invalid private key');
    }

    /**
     * Convenience to create a new instance from WIF string or buffer.
     */
    public static from(value: string | Buffer) {
        if (typeof value === 'string') {
            return PrivateKey.fromString(value);
        } else {
            return new PrivateKey(value);
        }
    }

    /**
     * Create a new instance from a WIF-encoded key.
     */
    public static fromString(wif: string) {
        return new PrivateKey(decodePrivate(wif).slice(1));
    }

    /**
     * Create a new instance from a seed.
     */
    public static fromSeed(seed: string) {
        return new PrivateKey(sha256(seed));
    }

    /**
     * Create key from username and password.
     */
    public static fromLogin(username: string, password: string, role: KeyRole = 'active') {
        const seed = username + role + password;
        return PrivateKey.fromSeed(seed);
    }

    /**
     * Sign message.
     * @param message 32-byte message.
     */
    public sign(message: Buffer): Signature {
        let rv: { signature: Buffer; recovery: number };
        let attempts = 0;
        do {
            const options = {
                data: sha256(Buffer.concat([message, Buffer.alloc(1, ++attempts)])),
            };
            rv = secp256k1.sign(message, this.key, options);
        } while (!isCanonicalSignature(rv.signature));
        return new Signature(rv.signature, rv.recovery);
    }

    /**
     * Derive the public key for this private key.
     */
    public createPublic(prefix?: string): PublicKey {
        return new PublicKey(secp256k1.publicKeyCreate(this.key), prefix);
    }

    /**
     * Return a WIF-encoded representation of the key.
     */
    public toString() {
        return encodePrivate(Buffer.concat([NETWORK_ID, this.key]));
    }

    /**
     * Used by `utils.inspect` and `console.log` in node.js. Does not show the full key
     * to get the full encoded key you need to explicitly call {@link toString}.
     */
    public inspect() {
        const key = this.toString();
        return `PrivateKey: ${key.slice(0, 6)}...${key.slice(-6)}`;
    }
}

/**
 * ECDSA (secp256k1) signature.
 */
export class Signature {
    constructor(public data: Buffer, public recovery: number) {
        assert.equal(data.length, 64, 'invalid signature');
    }

    public static fromBuffer(buffer: Buffer) {
        assert.equal(buffer.length, 65, 'invalid signature');
        const recovery = buffer.readUInt8(0) - 31;
        const data = buffer.slice(1);
        return new Signature(data, recovery);
    }

    public static fromString(string: string) {
        return Signature.fromBuffer(Buffer.from(string, 'hex'));
    }

    /**
     * Recover public key from signature by providing original signed message.
     * @param message 32-byte message that was used to create the signature.
     */
    public recover(message: Buffer, prefix?: string) {
        return new PublicKey(secp256k1.recover(message, this.data, this.recovery), prefix);
    }

    public toBuffer() {
        const buffer = Buffer.alloc(65);
        buffer.writeUInt8(this.recovery + 31, 0);
        this.data.copy(buffer, 1);
        return buffer;
    }

    public toString() {
        return this.toBuffer().toString('hex');
    }
}
/**
 * Return the sha256 transaction digest.
 * @param chainId The chain id to use when creating the hash.
 */
function transactionDigest(transaction: Transaction | SignedTransaction, chainId: Buffer = DEFAULT_CHAIN_ID) {
    const buffer = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
    try {
        Types.Transaction(buffer, transaction);
    } catch (cause) {
        throw new VError({ cause, name: 'SerializationError' }, 'Unable to serialize transaction');
    }
    buffer.flip();

    const transactionData = Buffer.from(buffer.toBuffer());
    const digest = sha256(Buffer.concat([chainId, transactionData]));
    return digest;
}

/**
 * Return copy of transaction with signature appended to signatures array.
 * @param transaction Transaction to sign.
 * @param keys Key(s) to sign transaction with.
 * @param options Chain id and address prefix, compatible with {@link Client}.
 */
function signTransaction(transaction: Transaction, keys: string | string[] | PrivateKey | PrivateKey[], chainId: Buffer = DEFAULT_CHAIN_ID) {
    const digest = transactionDigest(transaction, chainId);
    const signedTransaction = copy(transaction) as SignedTransaction;
    if (!signedTransaction.signatures) {
        signedTransaction.signatures = [];
    }

    const finalKeys: PrivateKey[] = (!Array.isArray(keys) ? [keys] : keys).map((key) => (typeof key === 'string' ? PrivateKey.from(key) : key));

    for (const key of finalKeys) {
        const signature = key.sign(digest);
        signedTransaction.signatures.push(signature.toString());
    }

    return signedTransaction;
}

function generateTrxId(transaction: Transaction) {
    const buffer = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
    try {
        Types.Transaction(buffer, transaction);
    } catch (cause) {
        throw new VError({ cause, name: 'SerializationError' }, 'Unable to serialize transaction');
    }
    buffer.flip();
    const transactionData = Buffer.from(buffer.toBuffer());
    return cryptoUtils.sha256(transactionData).toString('hex').slice(0, 40);
}

/** Misc crypto utility functions. */
export const cryptoUtils = {
    decodePrivate,
    doubleSha256,
    encodePrivate,
    encodePublic,
    generateTrxId,
    isCanonicalSignature,
    isWif,
    ripemd160,
    sha256,
    signTransaction,
    transactionDigest,
};
