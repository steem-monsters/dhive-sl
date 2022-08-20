import { Memo } from '../chain/memo';
// import hivejs from '@hiveio/hive-js';

describe('memo', function () {
    it('should encode and decode memo successfully without prefix', async () => {
        const baseMemo = 'testingtesting';
        const privateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
        const publicKey = 'STM8m5UgaFAAYQRuaNejYdS8FVLVp9Ss3K1qAVk5de6F8s3HnVbvA';
        const privateKey2 = '5JYsrHMfTM2Hh3heyPMYvRpuu9gFhoAYghb71EZH7VRLQkHu3Bc';
        const memo = new Memo();
        const encoded = memo.encode(baseMemo, publicKey, privateKey2);
        const decoded = memo.decode(encoded, privateKey);
        expect(decoded).toEqual(baseMemo);
        // const hivejsEncoded = hivejs.memo.encode(privateKey2, publicKey, `#${baseMemo}`);
        // const hivejsDecoded = memo.decode(hivejsEncoded, privateKey);
        // expect(hivejsDecoded).toEqual(baseMemo);
    });

    it('should encode and decode memo successfully with prefix input but without prefix output', async () => {
        const baseMemo = '#testingtesting';
        const privateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
        const publicKey = 'STM8m5UgaFAAYQRuaNejYdS8FVLVp9Ss3K1qAVk5de6F8s3HnVbvA';
        const memo = new Memo();
        const encoded = memo.encode(baseMemo, publicKey, privateKey).replace('#', '');
        const decoded = memo.decode(encoded, privateKey);
        expect(decoded).toEqual(baseMemo.substring(1));
    });

    it('should encode and decode memo successfully with prefix input but with prefix output ', async () => {
        const baseMemo = 'testingtesting';
        const privateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
        const publicKey = 'STM8m5UgaFAAYQRuaNejYdS8FVLVp9Ss3K1qAVk5de6F8s3HnVbvA';
        const memo = new Memo();
        const encoded = memo.encode(baseMemo, publicKey, privateKey);
        const decoded = memo.decode(encoded, privateKey, true);
        expect(decoded).toEqual(`#${baseMemo}`);
    });

    it('should encode and decode memo successfully with prefix input and with prefix output', async () => {
        const baseMemo = '#testingtesting';
        const privateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
        const publicKey = 'STM8m5UgaFAAYQRuaNejYdS8FVLVp9Ss3K1qAVk5de6F8s3HnVbvA';
        const memo = new Memo();
        const encoded = memo.encode(baseMemo, publicKey, privateKey);
        const decoded = memo.decode(encoded, privateKey, true);
        expect(decoded).toEqual(baseMemo);
    });
});
