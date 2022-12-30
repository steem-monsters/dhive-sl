// modified from source: https://github.com/dcodeIO/lxiv

// eslint-disable-next-line
// prettier-ignore
const aout = [65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,48,49,50,51,52,53,54,55,56,57,43,47];

// eslint-disable-next-line
// prettier-ignore
const ain = [,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,62,,,,63,52,53,54,55,56,57,58,59,60,61,,,,,,,,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,,,,,,,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51]

export const lxiv = {
    // Encodes bytes to base64 char codes.
    encode: (src, dst) => {
        let b, t;
        while ((b = src()) !== null) {
            dst(aout[(b >> 2) & 0x3f]);
            t = (b & 0x3) << 4;
            if ((b = src()) !== null) {
                t |= (b >> 4) & 0xf;
                dst(aout[(t | ((b >> 4) & 0xf)) & 0x3f]);
                t = (b & 0xf) << 2;
                if ((b = src()) !== null) dst(aout[(t | ((b >> 6) & 0x3)) & 0x3f]), dst(aout[b & 0x3f]);
                else dst(aout[t & 0x3f]), dst(61);
            } else dst(aout[t & 0x3f]), dst(61), dst(61);
        }
    },
    // Decodes base64 char codes to bytes.
    decode: (src, dst) => {
        let c, t1, t2;
        const fail = (c) => {
            throw Error('Illegal character code: ' + c);
        };

        while ((c = src()) !== null) {
            t1 = ain[c];
            if (typeof t1 === 'undefined') fail(c);
            if ((c = src()) !== null) {
                t2 = ain[c];
                if (typeof t2 === 'undefined') fail(c);
                dst(((t1 << 2) >>> 0) | ((t2 & 0x30) >> 4));
                if ((c = src()) !== null) {
                    t1 = ain[c];
                    if (typeof t1 === 'undefined')
                        if (c === 61) break;
                        else fail(c);
                    dst((((t2 & 0xf) << 4) >>> 0) | ((t1 & 0x3c) >> 2));
                    if ((c = src()) !== null) {
                        t2 = ain[c];
                        if (typeof t2 === 'undefined')
                            if (c === 61) break;
                            else fail(c);
                        dst((((t1 & 0x3) << 6) >>> 0) | t2);
                    }
                }
            }
        }
    },
    // Tests if a string is valid base64.
    test: (str) => /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(str),
};

export const utfx = {
    MAX_CODEPOINT: 0x10ffff,
    encodeUTF8: (src, dst) => {
        let cp: any = null;
        if (typeof src === 'number')
            (cp = src),
                (src = function () {
                    return null;
                });
        while (cp !== null || (cp = src()) !== null) {
            if (cp < 0x80) dst(cp & 0x7f);
            else if (cp < 0x800) dst(((cp >> 6) & 0x1f) | 0xc0), dst((cp & 0x3f) | 0x80);
            else if (cp < 0x10000) dst(((cp >> 12) & 0x0f) | 0xe0), dst(((cp >> 6) & 0x3f) | 0x80), dst((cp & 0x3f) | 0x80);
            else dst(((cp >> 18) & 0x07) | 0xf0), dst(((cp >> 12) & 0x3f) | 0x80), dst(((cp >> 6) & 0x3f) | 0x80), dst((cp & 0x3f) | 0x80);
            cp = null;
        }
    },
    decodeUTF8: (src, dst) => {
        let a, b, c, d;
        const fail = function (b) {
            b = b.slice(0, b.indexOf(null));
            const err = Error(b.toString());
            err.name = 'TruncatedError';
            err['bytes'] = b;
            throw err;
        };
        while ((a = src()) !== null) {
            if ((a & 0x80) === 0) dst(a);
            else if ((a & 0xe0) === 0xc0) (b = src()) === null && fail([a, b]), dst(((a & 0x1f) << 6) | (b & 0x3f));
            else if ((a & 0xf0) === 0xe0) ((b = src()) === null || (c = src()) === null) && fail([a, b, c]), dst(((a & 0x0f) << 12) | ((b & 0x3f) << 6) | (c & 0x3f));
            else if ((a & 0xf8) === 0xf0)
                ((b = src()) === null || (c = src()) === null || (d = src()) === null) && fail([a, b, c, d]),
                    dst(((a & 0x07) << 18) | ((b & 0x3f) << 12) | ((c & 0x3f) << 6) | (d & 0x3f));
            else throw RangeError('Illegal starting byte: ' + a);
        }
    },
    UTF16toUTF8: (src, dst) => {
        let c1,
            c2 = null;
        while (true) {
            if ((c1 = c2 !== null ? c2 : src()) === null) break;
            if (c1 >= 0xd800 && c1 <= 0xdfff) {
                if ((c2 = src()) !== null) {
                    if (c2 >= 0xdc00 && c2 <= 0xdfff) {
                        dst((c1 - 0xd800) * 0x400 + c2 - 0xdc00 + 0x10000);
                        c2 = null;
                        continue;
                    }
                }
            }
            dst(c1);
        }
        if (c2 !== null) dst(c2);
    },
    UTF8toUTF16: (src, dst) => {
        let cp: any = null;
        if (typeof src === 'number')
            (cp = src),
                (src = function () {
                    return null;
                });
        while (cp !== null || (cp = src()) !== null) {
            if (cp <= 0xffff) dst(cp);
            else (cp -= 0x10000), dst((cp >> 10) + 0xd800), dst((cp % 0x400) + 0xdc00);
            cp = null;
        }
    },
    encodeUTF16toUTF8: (src, dst) => {
        utfx.UTF16toUTF8(src, function (cp) {
            utfx.encodeUTF8(cp, dst);
        });
    },
    decodeUTF8toUTF16: (src, dst) => {
        utfx.decodeUTF8(src, function (cp) {
            utfx.UTF8toUTF16(cp, dst);
        });
    },
    calculateCodePoint: (cp) => {
        return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    },
    calculateUTF8: (src) => {
        let cp,
            l = 0;
        while ((cp = src()) !== null) l += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
        return l;
    },
    calculateUTF16asUTF8: (src) => {
        let n = 0,
            l = 0;
        utfx.UTF16toUTF8(src, function (cp) {
            ++n;
            l += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
        });
        return [n, l];
    },
};
