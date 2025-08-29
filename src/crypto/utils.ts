import Long from 'long';
import secureRandom from 'secure-random';
import { hexToBytes as _hexToBytes, abytes as assertBytes } from '@noble/hashes/utils';
import { randomBytes } from '@noble/hashes/utils';

const assertBool = (value: unknown): void => {
    if (typeof value !== 'boolean') throw new TypeError(`Expected boolean, got ${typeof value}`);
};
export { assertBytes, assertBool };

export const bytesToUtf8 = (data: Uint8Array) => {
    if (!(data instanceof Uint8Array)) throw new TypeError(`bytesToUtf8 expected Uint8Array, got ${typeof data}`);

    return new TextDecoder().decode(data);
};

export const hexToBytes = (data: string) => _hexToBytes(data.startsWith('0x') ? data.substring(2) : data);

/**
 * Returns an array of incrementing values starting at `begin` and incrementing by one for `length`.
 *
 * E.g.: `range(3)` → `[0, 1, 2]` and `range(3, 1)` → `[1, 2, 3]`
 *
 * @param length - the number of elements in the array
 * @param begin - the index at which the range starts (default: `0`)
 */
// const range = (length: number, begin = 0) => Array.from({ length }, (_, index) => begin + index);

export const bytesToBinaryString = (bytes: Uint8Array) => bytes.reduce((str, byte) => str + String.fromCharCode(byte), '');

export const binaryStringToBytes = (binaryDigits: string) => {
    const byteArray: any[] = [];
    for (let i = 0; i < binaryDigits.length; ++i) {
        byteArray.push(binaryDigits.charCodeAt(i) & 255);
    }
    return new Uint8Array(byteArray);
};

export const crypto: { node?: any; web?: Crypto } = (() => {
    const webCrypto = typeof self === 'object' && 'crypto' in self ? self.crypto : undefined;
    const nodeRequire = typeof module !== 'undefined' && typeof module.require === 'function' && module.require.bind(module);
    return {
        node: nodeRequire && !webCrypto ? nodeRequire('crypto') : undefined,
        web: webCrypto,
    };
})();

export const getRandomBytesSync = (bytes: number): Uint8Array => randomBytes(bytes);
export const getRandomBytes = async (bytes: number): Promise<Uint8Array> => randomBytes(bytes);

/** Returns unique 64 bit unsigned number string. Being time based, this is careful to never choose the same nonce twice. This value could be recorded in the blockchain for a long time.
 */
export const uniqueNonce = (): string => {
    if (unique_nonce_entropy === null) {
        const b = secureRandom.randomUint8Array(2);
        unique_nonce_entropy = parseInt(String((b[0] << 8) | b[1]), 10);
    }
    const entropy = ++unique_nonce_entropy % 0xffff;
    return Long.fromNumber(Date.now()).shiftLeft(16).or(Long.fromNumber(entropy));
};
let unique_nonce_entropy: any = null;

export const isTypedArray = (obj) => {
    return !!obj && obj.byteLength !== undefined;
};
