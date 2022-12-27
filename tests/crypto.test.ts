import { BroadcastAPI, CustomJsonOperation, CustomOperation, PrivateKey, PublicKey, Signature, Transaction } from '../src';
import { TEST_CLIENT } from './common';
import { generateUniqueNounce } from '../src/utils/utils';
import { hash } from '../src/crypto/hash';
import { hexToBytes } from '@noble/hashes/utils';

describe('crypto', function () {
    const testnetPrefix = 'STM';
    const testnetPair = {
        private: '5JQy7moK9SvNNDxn8rKNfQYFME5VDYC2j9Mv2tb7uXV5jz3fQR8',
        public: 'STM8FiV6v7yqYWTZz8WuFDckWr62L9X34hCy6koe8vd2cDJHimtgM',
    };
    const mainPair = {
        private: '5K2yDAd9KAZ3ZitBsAPyRka9PLFemUrbcL6UziZiPaw2c6jCeLH',
        public: 'STM8QykigLRi9ZUcNy1iXGY3KjRuCiLM8Ga49LHti1F8hgawKFc3K',
    };
    const mainPairPub = hexToBytes('03d0519ddad62bd2a833bee5dc04011c08f77f66338c38d99c685dee1f454cd1b8');
    const nullKey = 'STM1111111111111111111111111111111114T1Anm';
    const testSig = '202c52188b0ecbc26c766fe6d3ec68dac58644f43f43fc7d97da122f76fa028f98691dd48b44394bdd8cecbbe66e94795dcf53291a1ef7c16b49658621273ea68e';
    const testKey = PrivateKey.from('5K2yDAd9KAZ3ZitBsAPyRka9PLFemUrbcL6UziZiPaw2c6jCeLH');
    const testPubKey = testKey.createPublic();

    it('should decode public keys', function () {
        const k1 = PublicKey.fromString(testnetPair.public);
        expect(k1.prefix).toEqual(testnetPrefix);
        expect(k1.toString()).toEqual(testnetPair.public);
        const k2 = PublicKey.from(mainPair.public);
        expect(k2.toString()).toEqual(mainPair.public);
        const k3 = new PublicKey(mainPairPub, 'STM');
        expect(k2.toString()).toEqual(k3.toString());
        const k4 = PublicKey.from(testnetPair.public);
        expect(k4.toString()).toEqual(testnetPair.public);
        const k5 = PublicKey.from(nullKey);
        expect(k5.toString()).toEqual(nullKey);
        expect(k5.key).toEqual(new Uint8Array(33));
    });

    it('should decode private keys', function () {
        const k1 = PrivateKey.fromString(testnetPair.private);
        expect(k1.toString()).toEqual(testnetPair.private);
        const k2 = PrivateKey.from(mainPair.private);
        expect(k2.toString()).toEqual(mainPair.private);
    });

    it('should create public from private', function () {
        const key = PrivateKey.fromString(mainPair.private);
        const pubKey = key.createPublic().toString();
        expect(pubKey).toEqual(mainPair.public);
    });

    it('should handle prefixed keys', function () {
        const key = PublicKey.from(testnetPair.public);
        expect(key.toString()).toEqual(testnetPair.public);
        expect(PrivateKey.fromString(testnetPair.private).createPublic(testnetPrefix).toString()).toEqual(testnetPair.public);
    });

    // it('should conceal private key when inspecting', function () {
    //     const key = PrivateKey.fromString(testnetPair.private);
    //     // expect(inspect(key), "PrivateKey: 5JQy7m...z3fQR8");
    //     expect(inspect(key.createPublic(testnetPrefix).toString()), 'STX8FiV6v7yqYWTZz8WuFDckWr62L9X34hCy6koe8vd2cDJHimtgM');
    // });

    it('should sign message and verify', async function () {
        let correct = 0;
        let i = 0;
        while (i < 100) {
            i++;
            const message = generateUniqueNounce(32);
            const signature = testKey.signMessage(message);
            const pubKey = testKey.createPublic();
            if (pubKey.verifyMessage(message, signature)) correct++;
        }
        expect(correct).toEqual(i);
    });

    it('should de/encode signatures', function () {
        const signature = Signature.fromString(testSig);
        expect(signature.toString()).toEqual(testSig);
    });

    it('should recover pubkey from signatures', function () {
        let correct = 0;
        let i = 0;
        while (i < 100) {
            i++;
            const key = PrivateKey.fromString(testnetPair.private);
            const pubKey = key.createPublic().toString();
            const msg = hash.sha256(generateUniqueNounce(32));
            const signature = key.sign(msg);
            const recoveredKey = signature.recover(msg).toString();
            if (recoveredKey === pubKey) correct++;
        }

        expect(correct).toEqual(i);
    });

    it('should create key from login', function () {
        const key = PrivateKey.fromLogin('foo', 'barman');
        expect(key.createPublic().toString()).toEqual('STM87F7tN56tAUL2C6J9Gzi9HzgNpZdi6M2cLQo7TjDU5v178QsYA');
    });

    it('should sign and verify transaction', async function () {
        const op: CustomJsonOperation = ['custom_json', { id: 'test', json: JSON.stringify({}), required_auths: [], required_posting_auths: ['test'] }];
        const tx = await TEST_CLIENT.broadcast.createTransaction(op);
        const signedTx = tx.sign(testKey);
        const txDigest = signedTx.digest();

        const signed = tx.sign(testKey);
        const sig = Signature.fromString(signed.signatures[0]);

        expect(testPubKey.verify(txDigest, sig)).toBeTruthy();
        expect(sig.recover(txDigest).toString()).toEqual(testPubKey.toString());
    });

    it('should recover key from signature', function () {
        const tx = new Transaction({
            ref_block_num: 1234,
            ref_block_prefix: 1122334455,
            expiration: '2017-07-15T16:51:19',
            extensions: ['long-pants'],
            operations: [['vote', { voter: 'foo', author: 'bar', permlink: 'baz', weight: 10000 }]],
        });
        const signedTx = tx.sign(testKey);
        expect(signedTx.recoverKeyFromSignature(signedTx.signatures[0])?.toString()).toEqual(testPubKey.toString());
    });

    it('should handle serialization errors', function () {
        const tx = new Transaction({
            ref_block_num: 1234,
            ref_block_prefix: 1122334455,
            expiration: new Date().toISOString().slice(0, -5),
            extensions: [],
            operations: [['shutdown_network' as any, {}]],
        });

        try {
            tx.sign(testKey);
            // should not be reached
            expect(false).toBeTruthy();
        } catch (error: any) {
            expect(error.name).toEqual('SerializationError');
        }
    });

    it('should signMessage and verifyMessage', function () {
        const privateKey = PrivateKey.fromSeed('hello');
        const publicKey = privateKey.createPublic();
        const message = 'super secret';
        const signature = privateKey.signMessage(message);
        const confirmedMessage = publicKey.verifyMessage(message, signature);
        expect(confirmedMessage).toBeTruthy();
    });

    it('should fail signMessage and verifyMessage due to wrong message', function () {
        const privateKey = PrivateKey.fromSeed('hello');
        const publicKey = privateKey.createPublic();
        const message = 'super secret';
        const signature = privateKey.signMessage(message);
        const confirmedMessage = publicKey.verifyMessage('super secrett', signature);
        expect(confirmedMessage).toBeFalsy();
    });

    it('should fail signMessage and verifyMessage due to wrong public key', function () {
        const privateKey = PrivateKey.fromSeed('hello');
        const publicKey = PrivateKey.fromSeed('helloagain').createPublic();
        const message = 'super secret';
        const signature = privateKey.signMessage(message);
        const confirmedMessage = publicKey.verifyMessage(message, signature);
        expect(confirmedMessage).toBeFalsy();
    });
});
