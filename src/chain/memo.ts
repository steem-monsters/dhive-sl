import * as legacy from './legacy';
import ByteBuffer from 'bytebuffer';
import base58 from 'bs58';
import { DEFAULT_ADDRESS_PREFIX } from '../utils/constants';
import { PrivateKey, PublicKey } from './keys';
import { aes } from '../crypto/aes';
import { binaryStringToBytes, bytesToBinaryString, bytesToUtf8, isTypedArray, uniqueNonce } from '../crypto/utils';
import { hash } from '../crypto/hash';

const Long = ByteBuffer.Long;

export class Memo {
    private memoPrefix: string;
    private addressPrefix: string;
    private encodeTestResult: boolean;
    private regexPattern: RegExp;

    constructor(memoPrefix = '#', addressPrefix = DEFAULT_ADDRESS_PREFIX) {
        this.memoPrefix = memoPrefix;
        this.addressPrefix = addressPrefix;
        this.regexPattern = new RegExp(`^${this.memoPrefix}`, 'gi');
    }

    public async decode(memo: string, privateKey: string | PrivateKey, memoPrefix = false) {
        if (!memo) return memo;
        if (memo.match(this.regexPattern)) memo = memo.substring(this.memoPrefix.length);

        // this.checkEncryption();

        const privKey = PrivateKey.from(privateKey);
        const pubkey = privKey.createPublic();

        const { from, to, nonce, check, encrypted } = legacy.EncryptedMemoSerializer.fromBuffer(Uint8Array.from(base58.decode(memo) as any)) as any;

        const otherpub = pubkey.toString() === from.toString() ? to.toString() : from.toString();
        const decrypted = await this.crypt(encrypted, privKey, otherpub, nonce, check);

        // remove varint length prefix
        const mbuf = ByteBuffer.fromBinary(bytesToBinaryString(decrypted.message), ByteBuffer.DEFAULT_CAPACITY as any, ByteBuffer.LITTLE_ENDIAN);
        try {
            mbuf.mark();
            return `${memoPrefix ? this.memoPrefix : ''}${mbuf.readVString()}`;
        } catch (e) {
            mbuf.reset();
            // Sender did not length-prefix the memo
            memo = bytesToUtf8(binaryStringToBytes(mbuf.toString('binary')));
            return `${memoPrefix ? this.memoPrefix : ''}${memo}`;
        }
    }

    public async encode(memo: string, publicKey: string | PublicKey, privateKey: string | PrivateKey, testNonce?: string) {
        if (!memo) return memo;
        if (memo.match(this.regexPattern)) memo = memo.substring(this.memoPrefix.length);

        //  this.checkEncryption();

        const mbuf = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
        mbuf.writeVString(memo);

        const buffer: any = binaryStringToBytes(mbuf.copy(0, mbuf.offset).toBinary());

        const privKey = PrivateKey.from(privateKey);
        const pubKey = PublicKey.from(publicKey);

        const result = await this.crypt(buffer, privKey, pubKey, testNonce);
        const encrypted = legacy.EncryptedMemoSerializer.fromObject({
            from: privKey.createPublic(),
            to: pubKey,
            nonce: result.nonce,
            check: result.checksum,
            encrypted: result.message,
        });

        return `${this.memoPrefix}${base58.encode(legacy.EncryptedMemoSerializer.toBuffer(encrypted))}`;
    }

    public getPubKeys(memo: string) {
        if (!memo || !this.regexPattern.test(memo)) return [];
        memo = memo.substring(1);

        const { from, to } = legacy.EncryptedMemoSerializer.fromBuffer(Uint8Array.from(base58.decode(memo)));

        return [from.toString(), to.toString()];
    }

    private async crypt(message: Uint8Array, privateKey: PrivateKey, publicKey: PublicKey, nonce: string = uniqueNonce(), checksum?: any) {
        nonce = toLongObj(nonce);
        if (!nonce) throw new Error('nonce is required');

        if (!isTypedArray(message)) {
            if (typeof message !== 'string') throw new TypeError('message should be buffer or string');
            message = binaryStringToBytes(message);
        }
        if (checksum && typeof checksum !== 'number') throw new TypeError('checksum should be a number');

        const secret = privateKey.getSharedSecret(publicKey);

        let ebuf = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);

        ebuf.writeUint64(nonce);
        ebuf.append(bytesToBinaryString(secret), 'binary');
        ebuf = binaryStringToBytes(ebuf.copy(0, ebuf.offset).toBinary());
        const encryption_key = hash.sha512(ebuf);

        const iv = encryption_key.subarray(32, 48);
        const key = encryption_key.subarray(0, 32);

        // check is first 64 bit of sha256 hash treated as uint64_t truncated to 32 bits.
        let check = hash.sha256(encryption_key);
        check = check.subarray(0, 4);
        const cbuf = ByteBuffer.fromBinary(bytesToBinaryString(check), ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
        check = cbuf.readUint32();

        if (checksum) {
            if (check !== checksum) throw new Error('Invalid key');
            message = await aes.decrypt(message, key, iv);
        } else {
            message = await aes.encrypt(message, key, iv);
        }
        return { nonce, message, checksum: check };
    }

    //     private checkEncryption() {
    //         if (!this.encodeTestResult) {
    //             let plaintext;
    //             this.encodeTestResult = true; // prevent infinate looping
    //             try {
    //                 const privateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
    //                 const publicKey = 'STM8m5UgaFAAYQRuaNejYdS8FVLVp9Ss3K1qAVk5de6F8s3HnVbvA';
    //                 const cyphertext = this.encode('memo爱', publicKey, privateKey);
    //                 plaintext = this.decode(cyphertext, privateKey);
    //             } catch (e) {
    //                 console.error(e);
    //             } finally {
    //                 this.encodeTestResult = plaintext === 'memo爱';
    //             }
    //         }
    //         if (!this.encodeTestResult) throw new Error('This environment does not support encryption.');
    //     }
}

const toLongObj = (o: string | ByteBuffer.Long) => (o ? (Long.isLong(o) ? o : Long.fromString(o)) : o);
