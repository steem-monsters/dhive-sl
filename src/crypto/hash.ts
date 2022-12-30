import { ripemd160 } from '@noble/hashes/ripemd160';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';

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
