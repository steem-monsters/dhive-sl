// modified from source: https://github.com/ethereum/js-ethereum-cryptography/blob/master/src/aes.ts

import { concatBytes } from '@noble/hashes/utils';
import { crypto as cr } from '@noble/hashes/crypto';
import { hexToBytes } from './utils';
import { isArrayEqual } from '../utils/utils';

const crypto = cr?.node ? { node: cr.node } : cr?.web ? { web: cr.web } : { web: cr };

const validateOpt = (key: Uint8Array, iv: Uint8Array, mode: string) => {
    if (!mode.startsWith('aes-')) throw new Error(`AES submodule doesn't support mode ${mode}`);
    if (iv.length !== 16) throw new Error('AES: wrong IV length');
    if ((mode.startsWith('aes-128') && key.length !== 16) || (mode.startsWith('aes-256') && key.length !== 32)) throw new Error('AES: wrong key length');
};

const getBrowserKey = async (mode: string, key: Uint8Array, iv: Uint8Array): Promise<[CryptoKey, AesCbcParams | AesCtrParams]> => {
    if (!crypto.web) throw new Error('Browser crypto not available.');

    const keyMode: string | undefined = ['aes-128-cbc', 'aes-256-cbc'].includes(mode) ? 'cbc' : ['aes-128-ctr', 'aes-256-ctr'].includes(mode) ? 'ctr' : undefined;
    if (!keyMode) throw new Error('AES: unsupported mode');

    const wKey = await crypto.web.subtle.importKey('raw', key, { name: `AES-${keyMode.toUpperCase()}`, length: key.length * 8 }, true, ['encrypt', 'decrypt']);
    // node.js uses whole 128 bit as a counter, without nonce, instead of 64 bit
    // recommended by NIST SP800-38A
    return [wKey, { name: `aes-${keyMode}`, iv, counter: iv, length: 128 }];
};

async function encrypt(mode: string, msg: Uint8Array, key: Uint8Array, iv: Uint8Array, pkcs7PaddingEnabled = true): Promise<Uint8Array> {
    validateOpt(key, iv, mode);
    if (crypto.web) {
        const [wKey, wOpt] = await getBrowserKey(mode, key, iv);
        const cipher = await crypto.web.subtle.encrypt(wOpt, wKey, msg);
        // Remove PKCS7 padding on cbc mode by stripping end of message
        let res = new Uint8Array(cipher);
        if (!pkcs7PaddingEnabled && wOpt.name === 'aes-cbc' && !(msg.length % 16)) res = res.slice(0, -16);

        return res;
    } else if (crypto.node) {
        const cipher = crypto.node.createCipheriv(mode, key, iv);
        cipher.setAutoPadding(pkcs7PaddingEnabled);
        return concatBytes(cipher.update(msg), cipher.final());
    } else throw new Error("The environment doesn't have AES module");
}

async function getPadding(cypherText: Uint8Array, key: Uint8Array, iv: Uint8Array, mode: string) {
    const lastBlock = cypherText.slice(-16);
    for (let i = 0; i < 16; i++) {
        // Undo xor of iv and fill with lastBlock ^ padding (16)
        lastBlock[i] ^= iv[i] ^ 16;
    }
    const res = await encrypt(mode, lastBlock, key, iv);
    return res.slice(0, 16);
}

async function decrypt(mode: string, cypherText: Uint8Array, key: Uint8Array, iv: Uint8Array, pkcs7PaddingEnabled = true): Promise<Uint8Array> {
    validateOpt(key, iv, mode);
    if (crypto.web) {
        const [wKey, wOpt] = await getBrowserKey(mode, key, iv);
        // Add empty padding so Chrome will correctly decrypt message
        if (!pkcs7PaddingEnabled && wOpt.name === 'aes-cbc') {
            const padding = await getPadding(cypherText, key, iv, mode);
            cypherText = concatBytes(cypherText, padding);
        }
        const msg = await crypto.web.subtle.decrypt(wOpt, wKey, cypherText);
        const msgBytes = new Uint8Array(msg);
        // Safari always ignores padding (if no padding -> broken message)
        if (wOpt.name === 'aes-cbc') {
            const encrypted = await encrypt(mode, msgBytes, key, iv);
            if (!isArrayEqual(encrypted, cypherText)) throw new Error('AES: wrong padding');
        }
        return msgBytes;
    } else if (crypto.node) {
        const decipher = crypto.node.createDecipheriv(mode, key, iv);
        decipher.setAutoPadding(pkcs7PaddingEnabled);
        return concatBytes(decipher.update(cypherText), decipher.final());
    } else throw new Error("The environment doesn't have AES module");
}

export const aes = {
    decrypt: async (message: string | Uint8Array, key: Uint8Array, iv: Uint8Array) => {
        const bytes = typeof message === 'string' ? hexToBytes(message) : message;
        const decipher = await decrypt('aes-256-cbc', bytes, key, iv);
        return decipher;
    },
    encrypt: async (message: string | Uint8Array, key: Uint8Array, iv: Uint8Array) => {
        const bytes = typeof message === 'string' ? hexToBytes(message) : message;
        const cipher = await encrypt('aes-256-cbc', bytes, key, iv);
        return cipher;
    },
};
