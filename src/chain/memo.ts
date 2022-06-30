import ByteBuffer from 'bytebuffer';
import assert from 'assert';
import base58 from 'bs58';
import { encrypt, decrypt } from './serializer-hivejs/aes';
import { EncryptedMemoSerializer } from './serializer-hivejs/serializer';
import { PrivateKey, PublicKey } from './keys';
import { DEFAULT_ADDRESS_PREFIX } from '../client';

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

    public decode(memo: string, privateKey: string | PrivateKey) {
        assert(memo, 'memo is required');
        assert.equal(typeof memo, 'string', 'memo');
        if (!memo.match(this.regexPattern)) return memo;
        memo = memo.substring(this.memoPrefix.length);

        this.checkEncryption();

        const privKey = PrivateKey.from(privateKey).hivejsKey;

        const { from, to, nonce, check, encrypted } = EncryptedMemoSerializer.fromBuffer(Buffer.from(base58.decode(memo) as any, 'binary')) as any;
        const pubkey = privKey.toPublicKey().toString();
        const otherpub = pubkey === from.toString() ? to.toString() : from.toString();
        const decrypted = decrypt(encrypted, privKey, otherpub, check, nonce);

        // remove varint length prefix
        const mbuf = ByteBuffer.fromBinary(decrypted.toString('binary'), ByteBuffer.DEFAULT_CAPACITY as any, ByteBuffer.LITTLE_ENDIAN);
        try {
            mbuf.mark();
            return `${this.memoPrefix}${mbuf.readVString()}`;
        } catch (e) {
            mbuf.reset();
            // Sender did not length-prefix the memo
            memo = Buffer.from(mbuf.toString('binary'), 'binary').toString('utf-8');
            return `${this.memoPrefix}${memo}`;
        }
    }

    public encode(memo: string, publicKey: string | PublicKey, privateKey: string | PrivateKey, testNonce?: string) {
        assert(memo, 'memo is required');
        assert.equal(typeof memo, 'string', 'memo');
        if (memo.match(this.regexPattern)) {
            memo = memo.substring(this.memoPrefix.length);
        }

        this.checkEncryption();

        const mbuf = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
        mbuf.writeVString(memo);

        const buffer: any = Buffer.from(mbuf.copy(0, mbuf.offset).toBinary(), 'binary');
        const privKey = PrivateKey.from(privateKey).hivejsKey;
        const pubKey = PublicKey.from(publicKey).hivejsKey;

        const result = encrypt(buffer, privKey, pubKey, testNonce);
        const encrypted = EncryptedMemoSerializer.fromObject({
            from: privKey.toPublicKey(),
            to: pubKey,
            nonce: result.nonce,
            check: result.checksum,
            encrypted: result.message,
        });

        return `${this.memoPrefix}${base58.encode(Buffer.from(EncryptedMemoSerializer.toBuffer(encrypted) as any, 'binary'))}`;
    }

    public getPubKeys(memo: string) {
        assert(memo, 'memo is required');
        assert.equal(typeof memo, 'string', 'memo');
        if (!this.regexPattern.test(memo)) return [];
        memo = memo.substring(1);

        this.checkEncryption();

        const { from, to } = EncryptedMemoSerializer.fromBuffer(Buffer.from(base58.decode(memo) as any, 'binary'));

        return [from.toString(), to.toString()];
    }

    private checkEncryption() {
        if (!this.encodeTestResult) {
            let plaintext;
            this.encodeTestResult = true; // prevent infinate looping
            try {
                const privateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
                const publicKey = 'STM8m5UgaFAAYQRuaNejYdS8FVLVp9Ss3K1qAVk5de6F8s3HnVbvA';
                const cyphertext = this.encode('#memo爱', publicKey, privateKey);
                plaintext = this.decode(cyphertext, privateKey);
            } catch (e) {
                console.error(e);
            } finally {
                this.encodeTestResult = plaintext === '#memo爱';
            }
        }
        if (!this.encodeTestResult) throw new Error('This environment does not support encryption.');
    }
}
