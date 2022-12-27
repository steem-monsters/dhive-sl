import { Memo } from '../src/chain/memo';
import { PrivateKey } from '../src/chain';

describe('memo', function () {
    it('should encode and decode memo successfully without prefix', async () => {
        const baseMemo = 'testingtesting';
        const privateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
        const publicKey = PrivateKey.from(privateKey).createPublic().toString();
        const privateKey2 = '5JYsrHMfTM2Hh3heyPMYvRpuu9gFhoAYghb71EZH7VRLQkHu3Bc';
        const testNonce = '123';

        const memo = new Memo();
        const encoded = await memo.encode(baseMemo, publicKey, privateKey2, testNonce);
        const decoded = await memo.decode(encoded, privateKey);
        expect(decoded).toEqual(baseMemo);
        expect(encoded).toEqual('#FqMXi3bftzAKWoFmjBMxJ8VSx1NRJoHKa34s23czTXGSP6tWXXSm8PhwU1o7FPie6qo8dXHQRakQbp6jRg6Th2H6a8wHQ2krGKeQbqg5C467JEVWkcn1KiZ4n2nAtZ7zN');
    });

    it('should encode and decode memo successfully with prefix input but without prefix output', async () => {
        const baseMemo = '#testingtesting';
        const privateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
        const publicKey = 'STM8m5UgaFAAYQRuaNejYdS8FVLVp9Ss3K1qAVk5de6F8s3HnVbvA';
        const memo = new Memo();
        const encoded = await memo.encode(baseMemo, publicKey, privateKey);
        const decoded = await memo.decode(encoded.replace('#', ''), privateKey);
        expect(decoded).toEqual(baseMemo.substring(1));
    });

    it('should encode and decode memo successfully with prefix input but with prefix output ', async () => {
        const baseMemo = 'testingtesting';
        const privateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
        const publicKey = 'STM8m5UgaFAAYQRuaNejYdS8FVLVp9Ss3K1qAVk5de6F8s3HnVbvA';
        const memo = new Memo();
        const encoded = await memo.encode(baseMemo, publicKey, privateKey);
        const decoded = await memo.decode(encoded, privateKey, true);
        expect(decoded).toEqual(`#${baseMemo}`);
    });

    it('should encode and decode memo successfully with prefix input and with prefix output', async () => {
        const baseMemo = '#testingtesting';
        const privateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
        const publicKey = 'STM8m5UgaFAAYQRuaNejYdS8FVLVp9Ss3K1qAVk5de6F8s3HnVbvA';
        const memo = new Memo();
        const encoded = await memo.encode(baseMemo, publicKey, privateKey);
        const decoded = await memo.decode(encoded, privateKey, true);
        expect(decoded).toEqual(baseMemo);
    });
});
