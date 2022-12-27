import { ripemd160 } from '@noble/hashes/ripemd160';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
// import crypto from 'browserify-aes';
// import { TypedArray } from '@noble/hashes/utils';
// import { binaryStringToBytes } from './utils';

export const hash = {
    ripemd160(input: Uint8Array | string) {
        return ripemd160(input);
    },
    sha256(input: Uint8Array | string) {
        return sha256(input);
    },
    doubleSha256(input: Uint8Array | string) {
        return hash.sha256(hash.sha256(input));
    },
    sha512(input: Uint8Array | string) {
        return sha512(input);
    },
};

// const toBinaryBuffer = (o: string | TypedArray) => {
//     return o ? (typeof o === 'string' ? binaryStringToBytes(o) : o) : o;
// };

// export const cryptojs = {
//     decrypt: (message: string | TypedArray, key: string | TypedArray, iv?: string | TypedArray) => {
//         const binary = toBinaryBuffer(message);
//         const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
//         // decipher.setAutoPadding(true)
//         return Buffer.concat([decipher.update(binary), decipher.final()]);
//     },
//     encrypt: (message: string | TypedArray, key: string | TypedArray, iv?: string | TypedArray) => {
//         const binary = toBinaryBuffer(message);
//         const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
//         // cipher.setAutoPadding(true)
//         return Buffer.concat([cipher.update(binary), cipher.final()]);
//     },
// };
