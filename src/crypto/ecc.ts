// Taken & modified from
// https://github.com/cryptocoinjs/ecurve

/* Parts of this software are derivative works of Tom Wu `ec.js` (as part of JSBN).
 * See http://www-cs-students.stanford.edu/~tjw/jsbn/ec.js
 *
 * Copyright (c) 2003-2005  Tom Wu
 * All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY
 * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.
 *
 * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
 * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
 * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
 * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
 * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * In addition, the following condition applies:
 *
 * All redistributions must retain an intact copy of this copyright notice
 * and disclaimer.
 */

import BigInteger from 'bigi';

export type EccCurveName = 'secp128r1' | 'secp160k1' | 'secp160r1' | 'secp192k1' | 'secp192r1' | 'secp256k1' | 'secp256r1';

const ECC_CURVES = {
    secp128r1: {
        p: 'fffffffdffffffffffffffffffffffff',
        a: 'fffffffdfffffffffffffffffffffffc',
        b: 'e87579c11079f43dd824993c2cee5ed3',
        n: 'fffffffe0000000075a30d1b9038a115',
        h: '01',
        Gx: '161ff7528b899b2d0c28607ca52c5b86',
        Gy: 'cf5ac8395bafeb13c02da292dded7a83',
    },
    secp160k1: {
        p: 'fffffffffffffffffffffffffffffffeffffac73',
        a: '00',
        b: '07',
        n: '0100000000000000000001b8fa16dfab9aca16b6b3',
        h: '01',
        Gx: '3b4c382ce37aa192a4019e763036f4f5dd4d7ebb',
        Gy: '938cf935318fdced6bc28286531733c3f03c4fee',
    },
    secp160r1: {
        p: 'ffffffffffffffffffffffffffffffff7fffffff',
        a: 'ffffffffffffffffffffffffffffffff7ffffffc',
        b: '1c97befc54bd7a8b65acf89f81d4d4adc565fa45',
        n: '0100000000000000000001f4c8f927aed3ca752257',
        h: '01',
        Gx: '4a96b5688ef573284664698968c38bb913cbfc82',
        Gy: '23a628553168947d59dcc912042351377ac5fb32',
    },
    secp192k1: {
        p: 'fffffffffffffffffffffffffffffffffffffffeffffee37',
        a: '00',
        b: '03',
        n: 'fffffffffffffffffffffffe26f2fc170f69466a74defd8d',
        h: '01',
        Gx: 'db4ff10ec057e9ae26b07d0280b7f4341da5d1b1eae06c7d',
        Gy: '9b2f2f6d9c5628a7844163d015be86344082aa88d95e2f9d',
    },
    secp192r1: {
        p: 'fffffffffffffffffffffffffffffffeffffffffffffffff',
        a: 'fffffffffffffffffffffffffffffffefffffffffffffffc',
        b: '64210519e59c80e70fa7e9ab72243049feb8deecc146b9b1',
        n: 'ffffffffffffffffffffffff99def836146bc9b1b4d22831',
        h: '01',
        Gx: '188da80eb03090f67cbf20eb43a18800f4ff0afd82ff1012',
        Gy: '07192b95ffc8da78631011ed6b24cdd573f977a11e794811',
    },
    secp256k1: {
        p: 'fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f',
        a: '00',
        b: '07',
        n: 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141',
        h: '01',
        Gx: '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        Gy: '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
    },
    secp256r1: {
        p: 'ffffffff00000001000000000000000000000000ffffffffffffffffffffffff',
        a: 'ffffffff00000001000000000000000000000000fffffffffffffffffffffffc',
        b: '5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b',
        n: 'ffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551',
        h: '01',
        Gx: '6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296',
        Gy: '4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5',
    },
};

export class EccPoint {
    public curve;
    public x: BigInteger;
    public y: BigInteger;
    public z: BigInteger;
    public compressed: boolean;

    private _zInv: any;

    constructor(curve, x, y, z) {
        // assert.notStrictEqual(z, undefined, 'Missing Z coordinate');

        this.curve = curve;
        this.x = x;
        this.y = y;
        this.z = z;
        this._zInv = null;

        this.compressed = true;
    }

    get zInv() {
        if (this._zInv === null) {
            this._zInv = this.z.modInverse(this.curve.p);
        }

        return this._zInv;
    }

    get affineX() {
        return this.x.multiply(this.zInv).mod(this.curve.p);
    }

    get affineY() {
        return this.y.multiply(this.zInv).mod(this.curve.p);
    }

    public static fromAffine(x, y, curve = SecpCurve) {
        return new EccPoint(curve, x, y, BigInteger.ONE);
    }

    public equal(other) {
        if (other === this) return true;
        if (this.curve.isInfinity(this)) return this.curve.isInfinity(other);
        if (this.curve.isInfinity(other)) return this.curve.isInfinity(this);

        // u = Y2 * Z1 - Y1 * Z2
        const u = other.y.multiply(this.z).subtract(this.y.multiply(other.z)).mod(this.curve.p);

        if (u.signum() !== 0) return false;

        // v = X2 * Z1 - X1 * Z2
        const v = other.x.multiply(this.z).subtract(this.x.multiply(other.z)).mod(this.curve.p);

        return v.signum() === 0;
    }

    public negate() {
        const y = this.curve.p.subtract(this.y);

        return new EccPoint(this.curve, this.x, y, this.z);
    }

    public add(b) {
        if (this.curve.isInfinity(this)) return b;
        if (this.curve.isInfinity(b)) return this;

        const x1 = this.x;
        const y1 = this.y;
        const x2 = b.x;
        const y2 = b.y;

        // u = Y2 * Z1 - Y1 * Z2
        const u = y2.multiply(this.z).subtract(y1.multiply(b.z)).mod(this.curve.p);
        // v = X2 * Z1 - X1 * Z2
        const v = x2.multiply(this.z).subtract(x1.multiply(b.z)).mod(this.curve.p);

        if (v.signum() === 0) {
            if (u.signum() === 0) {
                return this.twice(); // this == b, so double
            }

            return this.curve.infinity; // this = -b, so infinity
        }

        const v2 = v.square();
        const v3 = v2.multiply(v);
        const x1v2 = x1.multiply(v2);
        const zu2 = u.square().multiply(this.z);

        // x3 = v * (z2 * (z1 * u^2 - 2 * x1 * v^2) - v^3)
        const x3 = zu2.subtract(x1v2.shiftLeft(1)).multiply(b.z).subtract(v3).multiply(v).mod(this.curve.p);
        // y3 = z2 * (3 * x1 * u * v^2 - y1 * v^3 - z1 * u^3) + u * v^3
        const y3 = x1v2.multiply(BigInteger.valueOf(3)).multiply(u).subtract(y1.multiply(v3)).subtract(zu2.multiply(u)).multiply(b.z).add(u.multiply(v3)).mod(this.curve.p);
        // z3 = v^3 * z1 * z2
        const z3 = v3.multiply(this.z).multiply(b.z).mod(this.curve.p);

        return new EccPoint(this.curve, x3, y3, z3);
    }

    public twice() {
        if (this.curve.isInfinity(this)) return this;
        // if (this.y.signum() === 0) return this.curve.infinity;

        const x1 = this.x;
        const y1 = this.y;

        const y1z1 = y1.multiply(this.z).mod(this.curve.p);
        const y1sqz1 = y1z1.multiply(y1).mod(this.curve.p);
        const a = this.curve.a;

        // w = 3 * x1^2 + a * z1^2
        let w = x1.square().multiply(BigInteger.valueOf(3));

        if (a.signum() !== 0) {
            w = w.add(this.z.square().multiply(a));
        }

        w = w.mod(this.curve.p);
        // x3 = 2 * y1 * z1 * (w^2 - 8 * x1 * y1^2 * z1)
        const x3 = w.square().subtract(x1.shiftLeft(3).multiply(y1sqz1)).shiftLeft(1).multiply(y1z1).mod(this.curve.p);
        // y3 = 4 * y1^2 * z1 * (3 * w * x1 - 2 * y1^2 * z1) - w^3
        const y3 = w
            .multiply(BigInteger.valueOf(3))
            .multiply(x1)
            .subtract(y1sqz1.shiftLeft(1))
            .shiftLeft(2)
            .multiply(y1sqz1)
            .subtract(w.pow(BigInteger.valueOf(3)))
            .mod(this.curve.p);
        // z3 = 8 * (y1 * z1)^3
        const z3 = y1z1.pow(BigInteger.valueOf(3)).shiftLeft(3).mod(this.curve.p);

        return new EccPoint(this.curve, x3, y3, z3);
    }

    // Simple NAF (Non-Adjacent Form) multiplication algorithm
    // TODO: modularize the multiplication algorithm
    multiply(k) {
        if (this.curve.isInfinity(this)) return this;
        if (k.signum() === 0) return this.curve.infinity;

        const e = k;
        const h = e.multiply(BigInteger.valueOf(3));

        const neg = this.negate();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let R = this;

        for (let i = h.bitLength() - 2; i > 0; --i) {
            const hBit = h.testBit(i);
            const eBit = e.testBit(i);

            // @ts-ignore
            R = R.twice();

            if (hBit !== eBit) {
                R = R.add(hBit ? this : neg);
            }
        }

        return R;
    }

    multiplyTwo(j, x, k) {
        let i = Math.max(j.bitLength(), k.bitLength()) - 1;
        let R = this.curve.infinity;
        const both = this.add(x);

        while (i >= 0) {
            const jBit = j.testBit(i);
            const kBit = k.testBit(i);

            R = R.twice();

            if (jBit) {
                if (kBit) {
                    R = R.add(both);
                } else {
                    R = R.add(this);
                }
            } else if (kBit) {
                R = R.add(x);
            }
            --i;
        }

        return R;
    }

    public getEncoded(compressed: boolean | null = null): Uint8Array {
        if (compressed == null) compressed = this.compressed;
        if (this.curve.isInfinity(this)) return new Uint8Array(1).fill(0); // Infinity point encoded is simply '00'

        const x: BigInteger = this.affineX;
        const y: BigInteger = this.affineY;
        const byteLength = this.curve.pLength;

        const buffer = new Uint8Array(1 + byteLength + (compressed ? 0 : byteLength));
        buffer[0] = compressed ? (y.isEven() ? 0x02 : 0x03) : 0x04;

        if (!compressed) y.toBuffer(byteLength).copy(buffer, 1 + byteLength);
        x.toBuffer(byteLength).copy(buffer, 1);

        return buffer;
    }

    public static decodeFrom(curve, buffer: Uint8Array): EccPoint {
        const type = buffer[0];
        const compressed = type !== 4;

        const byteLength = Math.floor((curve.p.bitLength() + 7) / 8);
        const x = BigInteger.fromBuffer(buffer.slice(1, 1 + byteLength));

        let Q;
        if (compressed) {
            if (buffer.length !== byteLength + 1) throw Error('Invalid sequence length');
            if (type !== 0x02 && type !== 0x03) throw Error('Invalid sequence tag');

            const isOdd = type === 0x03;
            Q = curve.pointFromX(isOdd, x);
        } else {
            if (buffer.length !== 1 + byteLength + byteLength) throw Error('Invalid sequence length');

            const y = BigInteger.fromBuffer(buffer.slice(1 + byteLength));
            Q = EccPoint.fromAffine(x, y, curve);
        }

        Q.compressed = compressed;
        return Q;
    }

    public toString() {
        if (this.curve.isInfinity(this)) return '(INFINITY)';

        return '(' + this.affineX.toString() + ',' + this.affineY.toString() + ')';
    }
}

export class EccCurve {
    public p: any;
    public a: any;
    public b: any;
    public G: any;
    public n: any;
    public h: any;
    public infinity: any;
    public pOverFour: any;
    public pLength: any;

    constructor(p, a, b, Gx, Gy, n, h) {
        this.p = p;
        this.a = a;
        this.b = b;
        this.G = EccPoint.fromAffine(Gx, Gy, this);
        this.n = n;
        this.h = h;

        this.infinity = new EccPoint(this, null, null, BigInteger.ZERO);

        // result caching
        this.pOverFour = p.add(BigInteger.ONE).shiftRight(2);

        // determine size of p in bytes
        this.pLength = Math.floor((this.p.bitLength() + 7) / 8);
    }

    public static fromCurveName(name: EccCurveName) {
        const curve = ECC_CURVES[name];
        if (!curve) return null;

        const p = new BigInteger(curve.p, 16, undefined);
        const a = new BigInteger(curve.a, 16, undefined);
        const b = new BigInteger(curve.b, 16, undefined);
        const n = new BigInteger(curve.n, 16, undefined);
        const h = new BigInteger(curve.h, 16, undefined);
        const Gx = new BigInteger(curve.Gx, 16, undefined);
        const Gy = new BigInteger(curve.Gy, 16, undefined);

        return new EccCurve(p, a, b, Gx, Gy, n, h);
    }

    public pointFromX(isOdd: any, x: any): EccPoint {
        const alpha = x.pow(3).add(this.a.multiply(x)).add(this.b).mod(this.p);
        const beta = alpha.modPow(this.pOverFour, this.p); // XXX: not compatible with all curves

        let y = beta;
        // check if works
        if (beta.isEven() !== !isOdd) {
            y = this.p.subtract(y); // -y % p
        }

        return EccPoint.fromAffine(x, y, this);
    }

    public isInfinity(Q) {
        if (Q === this.infinity) return true;

        return Q.z.signum() === 0 && Q.y.signum() !== 0;
    }

    public isOnCurve(Q) {
        if (this.isInfinity(Q)) return true;

        const x = Q.affineX;
        const y = Q.affineY;
        const a = this.a;
        const b = this.b;
        const p = this.p;

        // Check that xQ and yQ are integers in the interval [0, p - 1]
        if (x.signum() < 0 || x.compareTo(p) >= 0) return false;
        if (y.signum() < 0 || y.compareTo(p) >= 0) return false;

        // and check that y^2 = x^3 + ax + b (mod p)
        const lhs = y.square().mod(p);
        const rhs = x.pow(3).add(a.multiply(x)).add(b).mod(p);
        return lhs.equals(rhs);
    }

    public isValid(Q) {
        // Check Q != O
        if (this.isInfinity(Q)) return { valid: false, error: 'Point is at infinity' };
        if (!this.isOnCurve(Q)) return { valid: false, error: 'Point is not on the curve' };

        // Check nQ = O (where Q is a scalar multiple of G)
        const nQ = Q.multiply(this.n);
        if (!this.isInfinity(nQ)) return { valid: false, error: 'Point is not a scalar multiple of G' };

        return { valid: true };
    }
}

export const SecpCurve = EccCurve.fromCurveName('secp256k1');
