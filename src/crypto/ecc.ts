// modified from source: https://github.com/cryptocoinjs/ecurve

import BigInteger from 'bigi';

export class EccPoint {
    public compressed: boolean;
    private _zInv: any;

    constructor(public readonly curve: EccCurve, public x: BigInteger, public y: BigInteger, public z?: BigInteger) {
        this._zInv = null;
        this.compressed = true;
    }

    get zInv() {
        if (this._zInv === null) this._zInv = this.z.modInverse(this.curve.p);
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

    public negate() {
        return new EccPoint(this.curve, this.x, this.curve.p.subtract(this.y), this.z);
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
            if (u.signum() === 0) return this.twice(); // this == b, so double

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

    public static decodeFrom(curve: EccCurve, buffer: Uint8Array): EccPoint {
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
}

export class EccCurve {
    public G: any;
    public infinity: any;
    public pOverFour: any;
    public pLength: any;

    constructor(public p: any, public a: any, public b: any, Gx: any, Gy: any, public n: any, public h: any) {
        this.a = a;
        this.b = b;
        this.G = EccPoint.fromAffine(Gx, Gy, this);
        this.n = n;
        this.h = h;

        this.infinity = new EccPoint(this, null, null, BigInteger.ZERO);
        this.pOverFour = p.add(BigInteger.ONE).shiftRight(2);
        this.pLength = Math.floor((this.p.bitLength() + 7) / 8);
    }

    public static secp256k1() {
        const curve = {
            p: 'fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f',
            a: '00',
            b: '07',
            n: 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141',
            h: '01',
            Gx: '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
            Gy: '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
        };

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
        if (beta.isEven() !== !isOdd) y = this.p.subtract(y); // -y % p

        return EccPoint.fromAffine(x, y, this);
    }

    public isInfinity(Q) {
        if (Q === this.infinity) return true;

        return Q.z.signum() === 0 && Q.y.signum() !== 0;
    }
}

export const SecpCurve = EccCurve.secp256k1();
