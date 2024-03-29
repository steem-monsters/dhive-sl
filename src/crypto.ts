import { createHash } from 'crypto';

export const hash = {
    ripemd160(input: Buffer | Uint8Array | string): Buffer {
        return createHash('ripemd160').update(input).digest();
    },
    sha256(input: Buffer | Uint8Array | string): Buffer {
        return createHash('sha256').update(input).digest();
    },
    doubleSha256(input: Buffer | Uint8Array | string): Buffer {
        return hash.sha256(hash.sha256(input));
    },
    sha512(input: Buffer | Uint8Array | string) {
        return createHash('sha512').update(input).digest();
    },
};
