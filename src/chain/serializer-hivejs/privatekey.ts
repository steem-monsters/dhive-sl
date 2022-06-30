// Originally from hive-js - https://gitlab.syncad.com/hive/hive-js

import ecurve, { Point } from 'ecurve';
const secp256k1 = ecurve.getCurveByName('secp256k1');
import base58 from 'bs58';
import BigInteger from 'bigi';
import assert from 'assert';
import { hash } from '../../crypto';
import { PublicKeyHiveJs } from './publickey';

const n = secp256k1.n;

export class PrivateKeyHiveJS {
    private publicKey: any;

    /**
        @private see static functions
        @param {BigInteger}
    */
    constructor(private d: any) {
        this.d = d;
    }

    static fromBuffer(buf) {
        if (!Buffer.isBuffer(buf)) {
            throw new Error('Expecting paramter to be a Buffer type');
        }
        if (32 !== buf.length) {
            console.log(`WARN: Expecting 32 bytes, instead got ${buf.length}, stack trace:`, new Error().stack);
        }
        if (buf.length === 0) {
            throw new Error('Empty buffer');
        }
        return new PrivateKeyHiveJS(BigInteger.fromBuffer(buf));
    }

    /** @arg {string} seed - any length string.  This is private, the same seed produces the same private key every time.  */
    static fromSeed(seed) {
        // generate_private_key
        if (!(typeof seed === 'string')) {
            throw new Error('seed must be of type string');
        }
        return PrivateKeyHiveJS.fromBuffer(hash.sha256(seed));
    }

    static isWif(text) {
        try {
            this.fromWif(text);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
        @throws {AssertError|Error} parsing key
        @return Wallet Import Format (still a secret, Not encrypted)
    */
    static fromWif(_private_wif) {
        const private_wif = Buffer.from(base58.decode(_private_wif));
        const version = private_wif.readUInt8(0);
        assert.equal(0x80, version, `Expected version ${0x80}, instead got ${version}`);
        // checksum includes the version
        let private_key = private_wif.subarray(0, -4);
        const checksum = private_wif.subarray(-4);
        let new_checksum = hash.sha256(private_key);
        new_checksum = hash.sha256(new_checksum);
        new_checksum = new_checksum.subarray(0, 4);
        if (checksum.toString() !== new_checksum.toString()) throw new Error('Invalid WIF key (checksum miss-match)');

        private_key = private_key.subarray(1);
        return PrivateKeyHiveJS.fromBuffer(private_key);
    }

    toWif() {
        let private_key = this.toBuffer();
        // checksum includes the version
        private_key = Buffer.concat([Buffer.from([0x80]), private_key]);
        let checksum = hash.sha256(private_key);
        checksum = hash.sha256(checksum);
        checksum = checksum.subarray(0, 4);
        const private_wif = Buffer.concat([private_key, checksum]);
        return base58.encode(private_wif);
    }

    /** Alias for {@link toWif} */
    toString() {
        return this.toWif();
    }

    toPublicKeyPoint(): Point {
        return secp256k1.G.multiply(this.d);
    }

    toPublic() {
        if (this.publicKey) {
            return this.publicKey;
        }
        return (this.publicKey = PublicKeyHiveJs.fromPoint(this.toPublicKeyPoint()));
    }

    toBuffer() {
        return this.d.toBuffer(32);
    }

    /** ECIES */
    getSharedSecret(publicKey) {
        publicKey = toPublic(publicKey);
        const KB = publicKey.toUncompressed().toBuffer();
        const KBP = Point.fromAffine(
            secp256k1,
            BigInteger.fromBuffer(KB.slice(1, 33)), // x
            BigInteger.fromBuffer(KB.slice(33, 65)), // y
        );
        const r = this.toBuffer();
        const P = KBP.multiply(BigInteger.fromBuffer(r));
        const S = P.affineX.toBuffer(32);
        // SHA512 used in ECIES
        return hash.sha512(S);
    }

    // /** ECIES (does not always match the Point.fromAffine version above) */
    // getSharedSecret(publicKey){
    //     publicKey = toPublic(publicKey)
    //     var P = publicKey.Q.multiply( this.d );
    //     var S = P.affineX.toBuffer({size: 32});
    //     // ECIES, adds an extra sha512
    //     return hash.sha512(S);
    // }

    /** @throws {Error} - overflow of the key could not be derived */
    child(offset) {
        offset = Buffer.concat([this.toPublicKey().toBuffer(), offset]);
        offset = hash.sha256(offset);
        const c = BigInteger.fromBuffer(offset);

        if (c.compareTo(n) >= 0) throw new Error('Child offset went out of bounds, try again');

        const derived = this.d.add(c); //.mod(n)

        if (derived.signum() === 0) throw new Error('Child offset derived to an invalid key, try again');

        return new PrivateKeyHiveJS(derived);
    }

    // toByteBuffer() {
    //     var b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
    //     this.appendByteBuffer(b);
    //     return b.copy(0, b.offset);
    // }

    static fromHex(hex) {
        return PrivateKeyHiveJS.fromBuffer(Buffer.from(hex, 'hex'));
    }

    toHex() {
        return this.toBuffer().toString('hex');
    }

    toPublicKey() {
        return this.toPublic();
    }

    /* </helper_functions> */
}

const toPublic = (data) => (data == null ? data : data.Q ? data : PublicKeyHiveJs.fromStringOrThrow(data));
