// Originally from hive-js - https://gitlab.syncad.com/hive/hive-js

import secureRandom from 'secure-random';
import ByteBuffer from 'bytebuffer';
import crypto from 'browserify-aes';
import assert from 'assert';
import { hash } from '../../crypto';
import { PrivateKeyHiveJS } from './privatekey';
import { PublicKeyHiveJs } from './publickey';

const Long = ByteBuffer.Long;

/**
    Spec: http://localhost:3002/steem/@dantheman/how-to-encrypt-a-memo-when-transferring-steem
    @throws {Error|TypeError} - "Invalid Key, ..."

*/
export const encrypt = (message: Buffer, privateKey: PrivateKeyHiveJS, publicKey: PublicKeyHiveJs, nonce = uniqueNonce()) => {
    return crypt(message, privateKey, publicKey, nonce);
};

/**
    Spec: http://localhost:3002/steem/@dantheman/how-to-encrypt-a-memo-when-transferring-steem

    @throws {Error|TypeError} - "Invalid Key, ..."
*/
export const decrypt = (message: Buffer, privateKey: PrivateKeyHiveJS, publicKey: PublicKeyHiveJs, checksum: any, nonce = uniqueNonce()) => {
    return crypt(message, privateKey, publicKey, nonce, checksum).message;
};

export const crypt = (message: Buffer, privateKey: PrivateKeyHiveJS, publicKey: PublicKeyHiveJs, nonce: any, checksum?: any) => {
    nonce = toLongObj(nonce);
    if (!nonce) throw new TypeError('nonce is required');

    if (!Buffer.isBuffer(message)) {
        if (typeof message !== 'string') throw new TypeError('message should be buffer or string');
        message = Buffer.from(message, 'binary');
    }
    if (checksum && typeof checksum !== 'number') throw new TypeError('checksum should be a number');

    const S = privateKey.getSharedSecret(publicKey);
    let ebuf = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
    ebuf.writeUint64(nonce);
    ebuf.append(S.toString('binary'), 'binary');
    ebuf = Buffer.from(ebuf.copy(0, ebuf.offset).toBinary(), 'binary');
    const encryption_key = hash.sha512(ebuf);

    // D E B U G
    // console.log('crypt', {
    //     priv_to_pub: private_key.toPublicKey().toString(),
    //     pub: public_key.toString(),
    //     nonce: nonce.toString(),
    //     message: message.length,
    //     checksum,
    //     S: S.toString('hex'),
    //     encryption_key: encryption_key.toString('hex'),
    // })

    const iv = encryption_key.subarray(32, 48);
    const key = encryption_key.subarray(0, 32);

    // check is first 64 bit of sha256 hash treated as uint64_t truncated to 32 bits.
    let check = hash.sha256(encryption_key);
    check = check.subarray(0, 4);
    const cbuf = ByteBuffer.fromBinary(check.toString('binary'), ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
    check = cbuf.readUint32();

    if (checksum) {
        if (check !== checksum) throw new Error('Invalid key');
        message = cryptoJsDecrypt(message, key, iv);
    } else {
        message = cryptoJsEncrypt(message, key, iv);
    }
    return { nonce, message, checksum: check };
};

export const cryptoJsDecrypt = (message: string | Buffer, key, iv) => {
    assert(message, 'Missing cipher text');
    message = toBinaryBuffer(message);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    // decipher.setAutoPadding(true)
    return Buffer.concat([decipher.update(message), decipher.final()]);
};

export const cryptoJsEncrypt = (message: string | Buffer, key, iv) => {
    assert(message, 'Missing plain text');
    message = toBinaryBuffer(message);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    // cipher.setAutoPadding(true)
    message = Buffer.concat([cipher.update(message), cipher.final()]);
    return message;
};

/** Returns unique 64 bit unsigned number string. Being time based, this is careful to never choose the same nonce twice. This value could be recorded in the blockchain for a long time.
 */
export const uniqueNonce = () => {
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
// for(let i=1; i < 10; i++) key.uniqueNonce()

const toLongObj = (o) => (o ? (Long.isLong(o) ? o : Long.fromString(o)) : o);
const toBinaryBuffer = (o) => (o ? (Buffer.isBuffer(o) ? o : Buffer.from(o, 'binary')) : o);
