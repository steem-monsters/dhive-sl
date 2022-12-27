import ByteBuffer from 'bytebuffer';
import assert from '@noble/hashes/_assert';
import secureRandom from 'secure-random';
import { hexToBytes as _hexToBytes } from '@noble/hashes/utils';
import { randomBytes } from '@noble/hashes/utils';
const Long = ByteBuffer.Long;

const assertBool = assert.bool;
const assertBytes = assert.bytes;
export { assertBool, assertBytes };
export { bytesToHex, bytesToHex as toHex, concatBytes, createView, utf8ToBytes } from '@noble/hashes/utils';

// buf.toString('utf8') -> bytesToUtf8(buf)
export function bytesToUtf8(data: Uint8Array): string {
    if (!(data instanceof Uint8Array)) {
        throw new TypeError(`bytesToUtf8 expected Uint8Array, got ${typeof data}`);
    }
    return new TextDecoder().decode(data);
}

export function hexToBytes(data: string): Uint8Array {
    const sliced = data.startsWith('0x') ? data.substring(2) : data;
    return _hexToBytes(sliced);
}

// buf.equals(buf2) -> equalsBytes(buf, buf2)
export function equalsBytes(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

/**
 * Returns an array of incrementing values starting at `begin` and incrementing by one for `length`.
 *
 * E.g.: `range(3)` → `[0, 1, 2]` and `range(3, 1)` → `[1, 2, 3]`
 *
 * @param length - the number of elements in the array
 * @param begin - the index at which the range starts (default: `0`)
 */
// const range = (length: number, begin = 0) => Array.from({ length }, (_, index) => begin + index);

// source: https://github.com/bitauth/libauth/blob/master/src/lib/format/bin-string.ts#L25-L36
export const bytesToBinaryString = (bytes: Uint8Array) => {
    // Uses fromCharCode to support Buffer.from(bytes, 'binary) format instead of 11011100 format
    // bytes.reduce((str, byte) => str + byte.toString(2).padStart(8, '0'), '');
    return bytes.reduce((str, byte) => str + String.fromCharCode(byte), '');
};

export const binaryStringToBytes = (binaryDigits: string) => {
    //  splityEvery => range(Math.ceil(input.length / chunkLength))
    // .map((index) => index * chunkLength)
    // .map((begin) => input.slice(begin, begin + chunkLength));
    // Uint8Array.from(splitEvery(binaryDigits, 8).map((byteString) => parseInt(byteString, 2)));
    const byteArray: any[] = [];

    for (let i = 0; i < binaryDigits.length; ++i) {
        // if (i + offset >= dst.length || i >= src.length) {
        //     break;
        // }
        byteArray.push(binaryDigits.charCodeAt(i) & 255);
    }
    return new Uint8Array(byteArray);
};

// Internal utils
export function wrapHash(hash: (msg: Uint8Array) => Uint8Array) {
    return (msg: Uint8Array) => {
        assert.bytes(msg);
        return hash(msg);
    };
}

export const crypto: { node?: any; web?: Crypto } = (() => {
    const webCrypto = typeof self === 'object' && 'crypto' in self ? self.crypto : undefined;
    const nodeRequire = typeof module !== 'undefined' && typeof module.require === 'function' && module.require.bind(module);
    return {
        node: nodeRequire && !webCrypto ? nodeRequire('crypto') : undefined,
        web: webCrypto,
    };
})();

// https://github.com/ethereum/js-ethereum-cryptography/blob/master/src/random.ts

export function getRandomBytesSync(bytes: number): Uint8Array {
    return randomBytes(bytes);
}

export async function getRandomBytes(bytes: number): Promise<Uint8Array> {
    return randomBytes(bytes);
}

/** Returns unique 64 bit unsigned number string. Being time based, this is careful to never choose the same nonce twice. This value could be recorded in the blockchain for a long time.
 */
export const uniqueNonce = (): string => {
    if (unique_nonce_entropy === null) {
        const b: any = secureRandom.randomUint8Array(2);
        // @ts-ignore
        unique_nonce_entropy = parseInt((b[0] << 8) | b[1], 10);
    }
    let long = Long.fromNumber(Date.now());
    const entropy = ++unique_nonce_entropy % 0xffff;
    // console.log('uniqueNonce date\t', ByteBuffer.allocate(8).writeUint64(long).toHex(0))
    // console.log('uniqueNonce entropy\t', ByteBuffer.allocate(8).writeUint64(Long.fromNumber(entropy)).toHex(0))
    long = long.shiftLeft(16).or(Long.fromNumber(entropy));
    // console.log('uniqueNonce final\t', ByteBuffer.allocate(8).writeUint64(long).toHex(0))
    return long.toString();
};
let unique_nonce_entropy: any = null;

export const isTypedArray = (obj) => {
    return !!obj && obj.byteLength !== undefined;
};
