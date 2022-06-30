import { Memo } from '../chain/memo';
// import hivejs from '@hiveio/hive-js';

describe('memo', function () {
    it('should encode and decode successfully', async () => {
        // this.slow(500);
        // this.timeout(20 * 1000);
        const baseMemo = '#testingtesting';
        const privateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
        const publicKey = 'STM8m5UgaFAAYQRuaNejYdS8FVLVp9Ss3K1qAVk5de6F8s3HnVbvA';
        const memo = new Memo();
        const encoded = memo.encode(baseMemo, publicKey, privateKey);
        const decoded = memo.decode(encoded, privateKey);
        expect(decoded).toEqual(baseMemo);
        // const hivejsEncoded = hivejs.memo.encode(privateKey, publicKey, baseMemo);
        // const hivejsDecoded = memo.decode(hivejsEncoded, privateKey);
        // expect(hivejsDecoded).toEqual(baseMemo);
    });
});
