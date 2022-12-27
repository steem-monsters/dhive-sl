import { CURVE, Point, Signature as SecpSignature, getPublicKey, signSync, utils, verify } from '@noble/secp256k1';
import { Hex } from '../chain';
import { utils as _utils } from '@noble/secp256k1';
import { assertBool, assertBytes, hexToBytes, toHex } from './utils';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';

// Enable sync API for noble-secp256k1
_utils.hmacSha256Sync = (key: Uint8Array, ...messages: Uint8Array[]) => {
    const h = hmac.create(sha256, key);
    messages.forEach((msg) => h.update(msg));
    return h.digest();
};

// Use `secp256k1` module directly.
// This is a legacy compatibility layer for the npm package `secp256k1` via noble-secp256k1

function hexToNumber(hex: string): bigint {
    if (typeof hex !== 'string') {
        throw new TypeError('hexToNumber: expected string, got ' + typeof hex);
    }
    return BigInt(`0x${hex}`);
}

// Copy-paste from secp256k1, maybe export it?
export const bytesToNumber = (bytes: Uint8Array) => hexToNumber(toHex(bytes));
export const numberToHex = (num: number | bigint) => num.toString(16).padStart(64, '0');
export const numberToBytes = (num: number | bigint) => hexToBytes(numberToHex(num));

const ORDER = CURVE.n;

type Output = Uint8Array | ((len: number) => Uint8Array);
interface Signature {
    signature: Uint8Array;
    recid: number;
}

function output(out: Output = (len: number) => new Uint8Array(len), length: number, value?: Uint8Array) {
    if (typeof out === 'function') {
        out = out(length);
    }
    assertBytes(out, length);
    if (value) {
        out.set(value);
    }
    return out;
}

export const getSignature = (signature: Uint8Array) => {
    assertBytes(signature, 64);
    return SecpSignature.fromCompact(signature);
};

export function createPrivateKeySync(): Uint8Array {
    return utils.randomPrivateKey();
}

export async function createPrivateKey(): Promise<Uint8Array> {
    return createPrivateKeySync();
}

export function privateKeyVerify(privateKey: Uint8Array): boolean {
    assertBytes(privateKey, 32);
    return utils.isValidPrivateKey(privateKey);
}

export function publicKeyCreate(privateKey: Uint8Array, compressed = true, out?: Output): Uint8Array {
    assertBytes(privateKey, 32);
    assertBool(compressed);
    const res = getPublicKey(privateKey, compressed);
    return output(out, compressed ? 33 : 65, res);
}

export function publicKeyVerify(publicKey: Uint8Array): boolean {
    assertBytes(publicKey, 33, 65);
    try {
        Point.fromHex(publicKey);
        return true;
    } catch (e) {
        return false;
    }
}

export function ecdsaSign(msgHash: Uint8Array, privateKey: Uint8Array, extraEntropy?: Hex | true, out?: Output): Signature {
    assertBytes(msgHash, 32);
    assertBytes(privateKey, 32);

    const [signature, recid] = signSync(msgHash, privateKey, {
        recovered: true,
        der: false,
        extraEntropy,
        canonical: false,
    });
    return { signature: output(out, 64, signature), recid };
}

export function ecdsaRecover(signature: Uint8Array, recid: number, msgHash: Uint8Array, compressed = true, out?: Output) {
    assertBytes(msgHash, 32);
    assertBool(compressed);
    const sign = getSignature(signature).toHex();
    const point = Point.fromSignature(msgHash, sign, recid);
    return output(out, compressed ? 33 : 65, point.toRawBytes(compressed));
}

export function ecdsaVerify(signature: Uint8Array, msgHash: Uint8Array, publicKey: Uint8Array) {
    assertBytes(signature, 64);
    assertBytes(msgHash, 32);
    assertBytes(publicKey, 33, 65);
    assertBytes(signature, 64);
    const r = bytesToNumber(signature.slice(0, 32));
    const s = bytesToNumber(signature.slice(32, 64));
    if (r >= ORDER || s >= ORDER) {
        throw new Error('Cannot parse signature');
    }
    const pub = Point.fromHex(publicKey); // should not throw error
    let sig;
    try {
        sig = getSignature(signature);
    } catch (error) {
        return false;
    }
    return verify(sig, msgHash, pub);
}
