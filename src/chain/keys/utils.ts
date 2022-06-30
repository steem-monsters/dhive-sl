import assert from 'assert';
import * as bs58 from 'bs58';
import { hash } from '../../crypto';

export type KeyRole = 'owner' | 'active' | 'posting' | 'memo';

/**
 * Network id used in WIF-encoding.
 */
export const NETWORK_ID = Buffer.from([0x80]);

/**
 * Encode public key with bs58+ripemd160-checksum.
 */
const encodePublic = (key: Buffer, prefix: string): string => {
    const checksum = hash.ripemd160(key);
    return prefix + bs58.encode(Buffer.concat([key, checksum.slice(0, 4)]));
};

/**
 * Decode bs58+ripemd160-checksum encoded public key.
 */
const decodePublic = (encodedKey: string): { key: Buffer; prefix: string } => {
    const prefix = encodedKey.slice(0, 3);
    assert.equal(prefix.length, 3, 'public key invalid prefix');
    encodedKey = encodedKey.slice(3);
    const buffer: any = bs58.decode(encodedKey);
    const checksum = buffer.slice(-4);
    const key = buffer.slice(0, -4);
    const checksumVerify = hash.ripemd160(key).slice(0, 4);
    assert.deepEqual(checksumVerify, checksum, 'public key checksum mismatch');
    return { key, prefix };
};

/**
 * Encode bs58+doubleSha256-checksum private key.
 */
const encodePrivate = (key: Buffer): string => {
    assert.equal(key.readUInt8(0), 0x80, 'private key network id mismatch');
    const checksum = hash.doubleSha256(key);
    return bs58.encode(Buffer.concat([key, checksum.slice(0, 4)]));
};

/**
 * Decode bs58+doubleSha256-checksum encoded private key.
 */
const decodePrivate = (encodedKey: string): Buffer => {
    const buffer: any = bs58.decode(encodedKey);
    assert.deepEqual(buffer.slice(0, 1), NETWORK_ID, 'private key network id mismatch');
    const checksum = buffer.slice(-4);
    const key = buffer.slice(0, -4);
    const checksumVerify = hash.doubleSha256(key).slice(0, 4);
    assert.deepEqual(checksumVerify, checksum, 'private key checksum mismatch');
    return key;
};

/**
 * Return true if signature is canonical, otherwise false.
 */
const isCanonicalSignature = (signature: Buffer): boolean => {
    return !(signature[0] & 0x80) && !(signature[0] === 0 && !(signature[1] & 0x80)) && !(signature[32] & 0x80) && !(signature[32] === 0 && !(signature[33] & 0x80));
};

/**
 * Return true if string is wif, otherwise false.
 */
const isWif = (privWif: string | Buffer): boolean => {
    try {
        const bufWif = Buffer.from(bs58.decode(privWif as any));
        const privKey = bufWif.subarray(0, -4);
        const checksum = bufWif.subarray(-4);
        let newChecksum = hash.sha256(privKey);
        newChecksum = hash.sha256(newChecksum);
        newChecksum = newChecksum.subarray(0, 4);
        return checksum.toString() === newChecksum.toString();
    } catch (e) {
        return false;
    }
};

export const keyUtils = {
    encodePublic,
    decodePublic,
    encodePrivate,
    decodePrivate,
    isCanonicalSignature,
    isWif,
};
