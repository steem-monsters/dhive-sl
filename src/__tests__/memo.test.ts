import { PrivateKey } from '../chain';
import { TEST_CLIENT } from './common';
import { generateUniqueNounce } from '../utils/utils';
import { randomInt } from 'crypto';

describe('memo', function () {
    const testNonce = '123';
    const privateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
    const publicKey = PrivateKey.from(privateKey).createPublic().toString();
    const privateKey2 = '5JYsrHMfTM2Hh3heyPMYvRpuu9gFhoAYghb71EZH7VRLQkHu3Bc';
    it('should encode and decode memo successfully without prefix', async () => {
        const baseMemo = 'memo爱';
        const encoded = await TEST_CLIENT.memo.encode(baseMemo, publicKey, privateKey2, testNonce);
        const decoded = await TEST_CLIENT.memo.decode(encoded, privateKey);
        // console.log({ encoded, decoded }, decoded.length, baseMemo.length);
        expect(decoded).toEqual(baseMemo);
        expect(encoded).toEqual('#FqMXi3bftzAKWoFmjBMxJ8VSx1NRJoHKa34s23czTXGSP6tWXXSm8PhwU1o7FPie6qo8dXHQRakQbp6jRg6Th2H6a8wHQ2krGKeQbqg5C461y7TqPukk74FNHnpRVoXUR');
    });

    it('should encode and decode memo successfully with prefix input but without prefix output', async () => {
        const baseMemo = '#memo爱';
        const encoded = await TEST_CLIENT.memo.encode(baseMemo, publicKey, privateKey2, testNonce);
        const decoded = await TEST_CLIENT.memo.decode(encoded.replace('#', ''), privateKey);
        expect(decoded).toEqual(baseMemo.substring(1));
        expect(encoded).toEqual('#FqMXi3bftzAKWoFmjBMxJ8VSx1NRJoHKa34s23czTXGSP6tWXXSm8PhwU1o7FPie6qo8dXHQRakQbp6jRg6Th2H6a8wHQ2krGKeQbqg5C461y7TqPukk74FNHnpRVoXUR');
    });

    it('should encode and decode memo successfully with prefix input but with prefix output ', async () => {
        const baseMemo = 'memo爱';
        const encoded = await TEST_CLIENT.memo.encode(baseMemo, publicKey, privateKey2, testNonce);
        const decoded = await TEST_CLIENT.memo.decode(encoded, privateKey, true);
        expect(decoded).toEqual(`#${baseMemo}`);
        expect(encoded).toEqual('#FqMXi3bftzAKWoFmjBMxJ8VSx1NRJoHKa34s23czTXGSP6tWXXSm8PhwU1o7FPie6qo8dXHQRakQbp6jRg6Th2H6a8wHQ2krGKeQbqg5C461y7TqPukk74FNHnpRVoXUR');
    });

    it('should encode and decode memo successfully with prefix input and with prefix output', async () => {
        const baseMemo = '#memo爱';
        const encoded = await TEST_CLIENT.memo.encode(baseMemo, publicKey, privateKey2, testNonce);
        const decoded = await TEST_CLIENT.memo.decode(encoded, privateKey, true);
        expect(decoded).toEqual(baseMemo);
        expect(encoded).toEqual('#FqMXi3bftzAKWoFmjBMxJ8VSx1NRJoHKa34s23czTXGSP6tWXXSm8PhwU1o7FPie6qo8dXHQRakQbp6jRg6Th2H6a8wHQ2krGKeQbqg5C461y7TqPukk74FNHnpRVoXUR');
    });

    it('should encode and decode memo multiple times', async () => {
        let i = 0;
        const promises: any[] = [];
        // This doesn't really do much since this seems to be single thread only
        while (i < 10) {
            i++;
            promises.push(
                new Promise(async (resolve) => {
                    setTimeout(async () => {
                        const testNonce = generateUniqueNounce(8);
                        const baseMemo = generateUniqueNounce(randomInt(128)) + '✔️ ❤️ ☆爱';
                        const encoded = await TEST_CLIENT.memo.encode(baseMemo, publicKey, privateKey2, testNonce);
                        const decoded = await TEST_CLIENT.memo.decode(encoded, privateKey);
                        return resolve(decoded === baseMemo);
                    }, 1);
                }),
            );
        }
        const result = await Promise.all(promises);
        expect(result.filter((r) => !!r).length).toEqual(i);
    });
});
