import { hash } from '../../crypto';
import { randomBytes } from 'crypto';
import assert from 'assert';
import secp256k1 from 'secp256k1';
import { KeyRole, keyUtils, NETWORK_ID } from './utils';
import { DEFAULT_ADDRESS_PREFIX, DEFAULT_CHAIN_ID } from '../../client';
import { PublicKeyHiveJs } from '../serializer-hivejs/publickey';
import { PrivateKeyHiveJS } from '../serializer-hivejs/privatekey';

export interface GeneratedHiveKeys {
    owner: string;
    active: string;
    posting: string;
    memo: string;
    ownerPubkey: string;
    activePubkey: string;
    postingPubkey: string;
    memoPubkey: string;
}

export const generateKeys = (
    account: string,
    password: string,
    roles: KeyRole[] = ['posting', 'active', 'memo', 'owner'],
    addressPrefix = DEFAULT_ADDRESS_PREFIX,
): GeneratedHiveKeys => {
    const pubKeys: any = {};
    for (const role of roles) {
        const pk = PrivateKey.fromLogin(account, password, role);
        pubKeys[role] = pk.toString();
        pubKeys[`${role}Pubkey`] = pk.createPublic(addressPrefix).toString();
    }
    return pubKeys;
};

export const generatePassword = () => {
    return `P${PrivateKey.fromSeed(randomBytes(48).toString('hex')).toString()}`;
};

/**
 * ECDSA (secp256k1) public key.
 */
export class PublicKey {
    public hivejsKey: PublicKeyHiveJs;

    constructor(public readonly key: Buffer, public readonly prefix = DEFAULT_ADDRESS_PREFIX) {
        assert(secp256k1.publicKeyVerify(key), 'invalid public key');

        this.hivejsKey = PublicKeyHiveJs.fromStringOrThrow(this.toString(), prefix);
    }

    /**
     * Create a new instance from a WIF-encoded key.
     */
    public static fromString(wif: string) {
        const { key, prefix } = keyUtils.decodePublic(wif);
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
        return secp256k1.ecdsaVerify(signature.data, message, this.key);
    }

    public verifyMessage(message: string, signature: string) {
        const sig = Signature.fromString(signature);
        const buffer = Buffer.from(hash.sha256(message));
        return this.verify(buffer, sig);
    }

    /**
     * Return a WIF-encoded representation of the key.
     */
    public toString() {
        return keyUtils.encodePublic(this.key, this.prefix);
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

/**
 * ECDSA (secp256k1) private key.
 */
export class PrivateKey {
    public hivejsKey: PrivateKeyHiveJS;

    constructor(private key: Buffer) {
        assert(secp256k1.privateKeyVerify(key), 'invalid private key');

        this.hivejsKey = PrivateKeyHiveJS.fromWif(this.toString());
    }

    /**
     * Convenience to create a new instance from WIF string or buffer.
     */
    public static from(value: string | Buffer | PrivateKey) {
        if (typeof value === 'string') {
            return PrivateKey.fromString(value);
        } else if (value instanceof PrivateKey) {
            return value;
        } else {
            return new PrivateKey(value);
        }
    }

    /**
     * Create a new instance from a WIF-encoded key.
     */
    public static fromString(wif: string) {
        return new PrivateKey(keyUtils.decodePrivate(wif).slice(1));
    }

    /**
     * Create a new instance from a seed.
     */
    public static fromSeed(seed: string) {
        return new PrivateKey(hash.sha256(seed));
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
        let rv: { signature: Buffer; recid: number };
        let attempts = 0;
        do {
            const options = {
                data: hash.sha256(Buffer.concat([message, Buffer.alloc(1, ++attempts)])),
            };
            const { signature, recid } = secp256k1.ecdsaSign(message, this.key, options);
            rv = { signature: Buffer.from(signature), recid };
        } while (!keyUtils.isCanonicalSignature(rv.signature));
        return new Signature(rv.signature, rv.recid);
    }

    /**
     * Wrapper around sign
     * @param message 32-byte message.
     */
    public signMessage(message: string): string {
        return this.sign(Buffer.from(hash.sha256(message))).toString();
    }

    /**
     * Derive the public key for this private key.
     */
    public createPublic(prefix?: string): PublicKey {
        return new PublicKey(Buffer.from(secp256k1.publicKeyCreate(this.key)), prefix);
    }

    public isPublicKey(publicKey: string | PublicKey, prefix?: string) {
        return (publicKey instanceof PublicKey ? publicKey.toString() : publicKey) === this.createPublic(prefix).toString();
    }

    /**
     * Return a WIF-encoded representation of the key.
     */
    public toString() {
        return keyUtils.encodePrivate(Buffer.concat([NETWORK_ID, this.key]));
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
    constructor(public data: Buffer, public recid: number) {
        assert.equal(data.length, 64, 'invalid signature');
    }

    public static fromBuffer(buffer: Buffer) {
        assert.equal(buffer.length, 65, 'invalid signature');
        const recovery = buffer.readUInt8(0) - 31;
        const data = buffer.subarray(1);
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
        return new PublicKey(Buffer.from(secp256k1.ecdsaRecover(this.data, this.recid, message)), prefix);
    }

    public toBuffer() {
        const buffer = Buffer.alloc(65);
        buffer.writeUInt8(this.recid + 31, 0);
        this.data.copy(buffer, 1);
        return buffer;
    }

    public toString() {
        return this.toBuffer().toString('hex');
    }
}
