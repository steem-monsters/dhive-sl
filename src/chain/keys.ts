import * as bs58 from 'bs58';
import BigInteger from 'bigi';
import { DEFAULT_ADDRESS_PREFIX } from '../utils/constants';
import { EccPoint } from '../crypto/ecc';
import { SecpCurve } from '../crypto/ecc';
import { bytesToBinaryString } from '../crypto/utils';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils';
import { ecdsaRecover, ecdsaSign, ecdsaVerify, privateKeyVerify, publicKeyCreate, publicKeyVerify } from '../crypto/secp256k1';
import { hash } from '../crypto/hash';
import { isArrayEqual } from '../utils/utils';

export type PrivateKeyArg = string | string[] | PrivateKey | PrivateKey[];

export type KeyRoleOwner = 'owner';
export type KeyRoleActive = 'active';
export type KeyRolePosting = 'posting';
export type KeyRoleMemo = 'memo';
export type KeyRole = KeyRoleOwner | KeyRoleActive | KeyRolePosting | KeyRoleMemo;

/**
 * Network id used in WIF-encoding.
 */
export const NETWORK_ID = Uint8Array.from([0x80]);

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
    return `P${PrivateKey.fromSeed(bytesToHex(randomBytes(48))).toString()}`;
};

/**
 * ECDSA (secp256k1) public key.
 */
export class PublicKey {
    public key: Uint8Array;
    public point: EccPoint;
    public uncompressedKey: Uint8Array;

    private isNullKey: boolean;

    constructor(key: Uint8Array, public readonly prefix = DEFAULT_ADDRESS_PREFIX) {
        if (!publicKeyVerify(key)) if (!this.isNullKey) throw Error('invalid public key');

        this.key = key;
        this.isNullKey = isArrayEqual(this.key, new Uint8Array(33));
        if (!this.isNullKey) {
            this.point = this.decodePoint();
            this.uncompressedKey = this.point.getEncoded(false);
        }
    }

    /**
     * Create a new instance.
     */
    public static from(value: string | PublicKey | Uint8Array) {
        if (value instanceof PublicKey) {
            return value;
        } else if (typeof value === 'string') {
            return PublicKey.fromString(value);
        } else {
            return new PublicKey(value);
        }
    }

    /**
     * Create a new instance from a WIF-encoded key.
     */
    public static fromString(wif: string) {
        const prefix = wif.slice(0, 3);
        if (prefix.length !== 3) throw Error('public key invalid prefix');

        wif = wif.slice(3);
        const buffer = bs58.decode(wif);
        const checksum = buffer.slice(-4);
        const key = buffer.slice(0, -4);
        const checksumVerify = hash.ripemd160(key).subarray(0, 4);
        if (!isArrayEqual(checksum, checksumVerify)) throw Error('public key checksum mismatch');

        return new PublicKey(key, prefix);
    }

    private decodePoint() {
        return EccPoint.decodeFrom(SecpCurve, this.key);
    }

    /**
     * Verify a 32-byte signature.
     * @param message 32-byte message to verify.
     * @param signature Signature to verify.
     */
    public verify(message: Uint8Array, signature: Signature): boolean {
        return ecdsaVerify(signature.data, message, this.key);
    }

    public verifyMessage(message: string, signature: string) {
        const sig = Signature.fromString(signature);
        const buffer = Uint8Array.from(hash.sha256(message));
        return this.verify(buffer, sig);
    }

    /**
     * Return a WIF-encoded representation of the key.
     */
    public toString() {
        const checksum = hash.ripemd160(this.key);
        const buffer = new Uint8Array([...this.key, ...checksum.slice(0, 4)]);
        return this.prefix + bs58.encode(buffer);
    }

    public toBinaryString() {
        return bytesToBinaryString(this.point.getEncoded());
    }

    // public fromBinaryString(string: ) {
    //     return binaryStringToBytes()
    // }

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
    public key: Uint8Array;

    constructor(key: Uint8Array) {
        if (!privateKeyVerify(key)) throw Error('invalid private key');

        this.key = key;
    }

    /**
     * Convenience to create a new instance from WIF string or buffer.
     */
    public static from(value: string | Uint8Array | PrivateKey) {
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
        const decodedBuffer = bs58.decode(wif);
        if (decodedBuffer[0] !== NETWORK_ID[0]) throw Error('private key network id mismatch');

        const key = decodedBuffer.slice(0, -4);
        const checksum = decodedBuffer.slice(-4);
        const checksumVerify = hash.doubleSha256(key).subarray(0, 4);
        if (!isArrayEqual(checksum, checksumVerify)) throw Error('private key checksum mismatch');

        return new PrivateKey(key.slice(1));
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
     * Checks whether given key is a valid private key
     */
    public static isWif(key: string) {
        try {
            const bufWif = bs58.decode(key);
            const privKey = bufWif.subarray(0, -4);
            const checksum = bufWif.subarray(-4);
            let newChecksum = hash.sha256(privKey);
            newChecksum = hash.sha256(newChecksum);
            newChecksum = newChecksum.subarray(0, 4);
            return checksum.toString() === newChecksum.toString();
        } catch (e) {
            return false;
        }
    }

    /**
     * Sign 32 byte message
     */
    public sign(message: Uint8Array): Signature {
        let rv: { signature: Uint8Array; recid: number };
        let attempts = 0;
        do {
            const a = new Uint8Array(1);
            a[0] = ++attempts;
            const data = hash.sha256(new Uint8Array([...message, ...a]));
            const { signature, recid } = ecdsaSign(message, this.key, data);
            rv = { signature: Uint8Array.from(signature), recid };
        } while (!Signature.isCanonical(rv.signature));
        return new Signature(rv.signature, rv.recid);
    }

    /**
     * Wrapper around sign + returns string
     */
    public signMessage(message: string): string {
        return this.sign(hash.sha256(message)).toString();
    }

    /**
     * Derive the public key for this private key.
     */
    public createPublic(prefix?: string): PublicKey {
        return new PublicKey(publicKeyCreate(this.key), prefix);
    }

    /**
     * Checks whether the given public key is the public key from this private key
     */
    public isPublicKey(publicKey: string | PublicKey, prefix?: string) {
        const key = publicKey instanceof PublicKey ? publicKey.toString() : publicKey;
        return key === this.createPublic(prefix).toString();
    }

    /**
     * Return a WIF-encoded representation of the key.
     */
    public toString() {
        const key = new Uint8Array([...NETWORK_ID, ...this.key]);
        if (key[0] != 0x80) throw Error('private key network id mismatch');
        const checksum = hash.doubleSha256(key);
        return bs58.encode(new Uint8Array([...key, ...checksum.subarray(0, 4)]));
    }

    /**
     * Returns the shared secret with the given public key
     */
    public getSharedSecret(publicKey: string | PublicKey) {
        const key = publicKey instanceof PublicKey ? publicKey : PublicKey.from(publicKey);
        const KBP = EccPoint.fromAffine(
            BigInteger.fromBuffer(key.uncompressedKey.slice(1, 33)), // x
            BigInteger.fromBuffer(key.uncompressedKey.slice(33, 65)), // y
        );
        const r = this.key;
        const P = KBP.multiply(BigInteger.fromBuffer(r));
        const S = P.affineX.toBuffer(32);
        // SHA512 used in ECIES
        return hash.sha512(S);
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
    constructor(public data: Uint8Array, public recid: number) {
        if (data.length !== 64) throw Error(`invalid signature. Expected length: 64 - Given: ${data?.length ?? 0}`);
    }

    public static fromBuffer(buffer: Uint8Array) {
        const recovery = buffer[0] - 31;
        const data = buffer.slice(1);
        return new Signature(data, recovery);
    }

    public static fromString(string: string) {
        return Signature.fromBuffer(hexToBytes(string));
    }

    /**
     * Recover public key from signature by providing original signed message.
     * @param message 32-byte message that was used to create the signature.
     */
    public recover(message: Uint8Array, prefix?: string) {
        return new PublicKey(ecdsaRecover(this.data, this.recid, message, true), prefix);
    }

    public toBuffer() {
        const buffer = new Uint8Array(65);
        buffer[0] = this.recid + 31;
        buffer.set(this.data, 1);
        return buffer;
    }

    public toString() {
        return bytesToHex(this.toBuffer());
    }

    public static isCanonical(signature: any) {
        return !(signature[0] & 0x80) && !(signature[0] === 0 && !(signature[1] & 0x80)) && !(signature[32] & 0x80) && !(signature[32] === 0 && !(signature[33] & 0x80));
    }
}
