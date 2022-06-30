// Originally from hive-js - https://gitlab.syncad.com/hive/hive-js

import ecurve from 'ecurve';
const secp256k1 = ecurve.getCurveByName('secp256k1');
import base58 from 'bs58';
import BigInteger from 'bigi';
import assert from 'assert';
import { hash } from '../../crypto';
import { DEFAULT_ADDRESS_PREFIX } from '../../client';
// var config = require('../../../config');

const G = secp256k1.G;
const n = secp256k1.n;

export class PublicKeyHiveJs {
    private pubdata: any;

    /** @param {ecurve.Point} public key */
    constructor(public Q) {}

    static fromBinary(bin) {
        return PublicKeyHiveJs.fromBuffer(Buffer.from(bin, 'binary'));
    }

    static fromBuffer(buffer) {
        if (buffer.toString('hex') === '000000000000000000000000000000000000000000000000000000000000000000') return new PublicKeyHiveJs(null);
        return new PublicKeyHiveJs(ecurve.Point.decodeFrom(secp256k1, buffer));
    }

    toBuffer(compressed = this.Q ? this.Q.compressed : null) {
        if (this.Q === null) return Buffer.from('000000000000000000000000000000000000000000000000000000000000000000', 'hex');
        return this.Q.getEncoded(compressed);
    }

    static fromPoint(point) {
        return new PublicKeyHiveJs(point);
    }

    toUncompressed() {
        const buf = this.Q.getEncoded(false);
        const point = ecurve.Point.decodeFrom(secp256k1, buf);
        return PublicKeyHiveJs.fromPoint(point);
    }

    /** bts::blockchain::address (unique but not a full public key) */
    toBlockchainAddress() {
        const pub_buf = this.toBuffer();
        const pub_sha = hash.sha512(pub_buf);
        return hash.ripemd160(pub_sha);
    }

    toString(address_prefix = DEFAULT_ADDRESS_PREFIX) {
        return this.toPublicKeyString(address_prefix);
    }

    /**
        Full public key
        {return} string
    */
    toPublicKeyString(address_prefix = DEFAULT_ADDRESS_PREFIX) {
        if (this.pubdata) return address_prefix + this.pubdata;
        const pub_buf = this.toBuffer();
        const checksum = hash.ripemd160(pub_buf);
        const addy = Buffer.concat([pub_buf, checksum.slice(0, 4)]);
        this.pubdata = base58.encode(addy);
        return address_prefix + this.pubdata;
    }

    /**
        @arg {string} public_key - like STMXyz...
        @arg {string} address_prefix - like STM
        @return PublicKeyHiveJs or `null` (if the public_key string is invalid)
        @deprecated fromPublicKeyString (use fromString instead)
    */
    static fromString(public_key, address_prefix = DEFAULT_ADDRESS_PREFIX) {
        try {
            return PublicKeyHiveJs.fromStringOrThrow(public_key, address_prefix);
        } catch (e) {
            return null;
        }
    }

    /**
        @arg {string} public_key - like STMXyz...
        @arg {string} address_prefix - like STM
        @throws {Error} if public key is invalid
        @return PublicKeyHiveJs
    */
    static fromStringOrThrow(public_key, address_prefix = DEFAULT_ADDRESS_PREFIX) {
        const prefix = public_key.slice(0, address_prefix.length);
        assert.equal(address_prefix, prefix, `Expecting key to begin with ${address_prefix}, instead got ${prefix}`);
        public_key = public_key.slice(address_prefix.length);

        public_key = Buffer.from(base58.decode(public_key) as any, 'binary');
        const checksum = public_key.slice(-4);
        public_key = public_key.slice(0, -4);
        let new_checksum = hash.ripemd160(public_key);
        new_checksum = new_checksum.slice(0, 4);
        assert.deepEqual(checksum, new_checksum, 'Checksum did not match');
        return PublicKeyHiveJs.fromBuffer(public_key);
    }

    toAddressString(address_prefix = DEFAULT_ADDRESS_PREFIX) {
        const pub_buf = this.toBuffer();
        const pub_sha = hash.sha512(pub_buf);
        let addy = hash.ripemd160(pub_sha);
        const checksum = hash.ripemd160(addy);
        addy = Buffer.concat([addy, checksum.slice(0, 4)]);
        return address_prefix + base58.encode(addy);
    }

    toPtsAddy() {
        const pub_buf = this.toBuffer();
        const pub_sha = hash.sha256(pub_buf);
        let addy = hash.ripemd160(pub_sha);
        addy = Buffer.concat([Buffer.from([0x38]), addy]); //version 56(decimal)

        let checksum = hash.sha256(addy);
        checksum = hash.sha256(checksum);

        addy = Buffer.concat([addy, checksum.slice(0, 4)]);
        return base58.encode(addy);
    }

    child(offset) {
        assert(Buffer.isBuffer(offset), 'Buffer required: offset');
        assert.equal(offset.length, 32, 'offset length');

        offset = Buffer.concat([this.toBuffer(), offset]);
        offset = hash.sha256(offset);

        const c = BigInteger.fromBuffer(offset);

        if (c.compareTo(n) >= 0) throw new Error('Child offset went out of bounds, try again');

        const cG = G.multiply(c);
        const Qprime = this.Q.add(cG);

        if (secp256k1.isInfinity(Qprime)) throw new Error('Child offset derived to an invalid key, try again');

        return PublicKeyHiveJs.fromPoint(Qprime);
    }

    // toByteBuffer() {
    //     var b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
    //     this.appendByteBuffer(b);
    //     return b.copy(0, b.offset);
    // }

    static fromHex(hex) {
        return PublicKeyHiveJs.fromBuffer(Buffer.from(hex, 'hex'));
    }

    toHex() {
        return this.toBuffer().toString('hex');
    }

    static fromStringHex(hex) {
        return PublicKeyHiveJs.fromString(Buffer.from(hex, 'hex'));
    }

    /* </HEX> */
}
