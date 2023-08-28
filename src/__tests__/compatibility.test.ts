/**
 * This file tests the compatability between this updated library and the old dhive/hive-js
 * You need to install @hiveio/hive-js and @hiveio/dhive as dependancies to run these
 * npm i @hiveio/hive-js @hiveio/dhive
 */

// import * as hivejs from '@hiveio/hive-js';
// import * as olddhive from '@hiveio/dhive';
// import { Memo, PrivateKey, Signature, generatePassword } from '../chain';
// import { OPERATION_IDS, OPERATION_ID_KEYS } from '../utils/constants';
// import { hash } from '../crypto/hash';
// import { makeBitMaskFilter as hivejsMakeBitMaskFilter } from '@hiveio/hive-js/lib/auth/serializer';
// import { makeBitMaskFilter } from '../utils/bitmaskFilter';

// describe('comp', function () {
//     it('should do nothing', () => {});
//     it('crypto should be backwards-compatible to dhive', () => {
//         const password = generatePassword();
//         expect(password).toHaveLength('P5K4mh5Ps1fo9CkmQNCiqwNosSyRbhWYXnN1TSDM7apErnDxoNgF'.length);
//         expect(password.slice(0, 2)).toEqual('P5');
//         const oldPrivateKey = olddhive.PrivateKey.fromSeed('hello');
//         const privateKey = PrivateKey.fromSeed('hello');
//         const oldPublicKey = oldPrivateKey.createPublic();
//         const publicKey = privateKey.createPublic();
//         expect(privateKey.toString()).toEqual(oldPrivateKey.toString());
//         expect(publicKey.toString()).toEqual(oldPublicKey.toString());
//         const messageText = 'test';
//         const message = hash.sha256(messageText);
//         const signedMessage = privateKey.sign(message);
//         const oldSignedMessage = oldPrivateKey.sign(Buffer.from(message));
//         expect(signedMessage.toString().length).toEqual(oldSignedMessage.toString().length);
//         expect(signedMessage.toString()).toEqual(oldSignedMessage.toString());
//         expect(publicKey.verifyMessage(messageText, oldSignedMessage.toString())).toBeTruthy();
//         const sig = olddhive.Signature.fromString(signedMessage.toString());
//         const buffer = Buffer.from(message);
//         expect(oldPublicKey.verify(buffer, sig)).toBeTruthy();
//         const newSig = Signature.fromString(oldSignedMessage.toString());
//         expect(newSig.toString()).toEqual(sig.toString());
//         expect(newSig.recover(message).toString()).toEqual(oldPublicKey.toString());
//     });
//     it('memo encoding/decoding should be backwards-compatible to hivejs', async () => {
//         const baseMemo = 'testingtesting';
//         const privateKey = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';
//         const publicKey = PrivateKey.from(privateKey).createPublic().toString();
//         const privateKey2 = '5JYsrHMfTM2Hh3heyPMYvRpuu9gFhoAYghb71EZH7VRLQkHu3Bc';
//         const testNonce = '123';
//         const memo = new Memo();
//         const encoded = await memo.encode(baseMemo, publicKey, privateKey2, testNonce);
//         const decoded = await memo.decode(encoded, privateKey);

//         expect(decoded).toEqual(baseMemo);
//         const hivejsEncoded = hivejs.memo.encode(privateKey2, publicKey, `#${baseMemo}`, testNonce);
//         const hivejsDecoded = hivejs.memo.decode(privateKey, hivejsEncoded);
//         expect(hivejsDecoded).toEqual(`#${baseMemo}`);
//         const mixedDecoded1 = await memo.decode(hivejsEncoded, privateKey);
//         expect(mixedDecoded1).toEqual(`${baseMemo}`);
//         const mixedDecoded2 = hivejs.memo.decode(privateKey, encoded);
//         expect(mixedDecoded2).toEqual(`#${baseMemo}`);
//     });
//     it('should make bitmask filter', function () {
//         const bitmask = makeBitMaskFilter(OPERATION_ID_KEYS);
//         const operationIds: any[] = [];
//         OPERATION_ID_KEYS.map((operationName) => {
//             const operationId = OPERATION_IDS[operationName];
//             if (!Number.isNaN(operationId)) operationIds.push(operationId);
//         });
//         const bitmask2 = hivejsMakeBitMaskFilter(operationIds);
//         expect(bitmask).toEqual(bitmask2);
//     });
// });
