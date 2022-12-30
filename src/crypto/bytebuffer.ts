// modified from source: https://github.com/protobufjs/bytebuffer.js

import Long from 'long';
import { lxiv, utfx } from './lxiv-utfx';

const EMPTY_BUFFER = new Uint8Array(0);

export class ByteBuffer {
    public static DEFAULT_CAPACITY = 16;
    public static METRICS_CHARS = 'c';
    public static METRICS_BYTES = 'b';

    public buffer: any;
    public view: any;
    public offset: number;
    public limit: number;
    public markedOffset: number;

    constructor(private readonly capacity: number = ByteBuffer.DEFAULT_CAPACITY) {
        this.buffer = new ArrayBuffer(capacity);
        this.view = new Uint8Array(this.buffer);

        this.offset = 0;
        this.markedOffset = -1;
        this.limit = capacity;
    }

    public static calculateVarint32(value) {
        // ref: src/google/protobuf/io/coded_stream.cc
        value = value >>> 0;
        if (value < 1 << 7) return 1;
        else if (value < 1 << 14) return 2;
        else if (value < 1 << 21) return 3;
        else if (value < 1 << 28) return 4;
        else return 5;
    }

    public static fromBase64(str) {
        if (typeof str !== 'string') throw TypeError('str');
        const bb = new ByteBuffer((str.length / 4) * 3);
        let i = 0;
        lxiv.decode(stringSource(str), function (b) {
            bb.view[i++] = b;
        });
        bb.limit = i;
        return bb;
    }

    public static fromHex(str: string) {
        str = BBAssert.checkString(str);
        if (str.length % 2 !== 0) throw TypeError('Illegal str: Length not a multiple of 2');

        const k = str.length;
        const bb = new ByteBuffer((k / 2) | 0);
        let b;
        let j = 0;
        for (let i = 0; i < k; i += 2) {
            b = parseInt(str.substring(i, i + 2), 16);
            if (!isFinite(b) || b < 0 || b > 255) throw TypeError('Illegal str: Contains non-hex characters');
            bb.view[j++] = b;
        }
        bb.limit = j;
        return bb;
    }

    public static fromBinary(str: string) {
        if (typeof str !== 'string') throw TypeError('str');
        let i = 0;
        const k = str.length;
        let charCode;
        const bb = new ByteBuffer(k);
        while (i < k) {
            charCode = str.charCodeAt(i);
            if (charCode > 0xff) throw RangeError('illegal char code: ' + charCode);
            bb.view[i++] = charCode;
        }
        bb.limit = k;
        return bb;
    }

    public static fromUTF8(str: string) {
        str = BBAssert.checkString(str);
        const bb = new ByteBuffer(utfx.calculateUTF16asUTF8(stringSource(str))[1]);
        let i = 0;
        utfx.encodeUTF16toUTF8(stringSource(str), function (b) {
            bb.view[i++] = b;
        });
        bb.limit = i;
        return bb;
    }

    public static clone(copy: ByteBuffer) {
        const bb = new ByteBuffer(0);
        bb.buffer = new ArrayBuffer(copy.buffer.byteLength);
        bb.view = new Uint8Array(bb.buffer);
        bb.offset = copy.offset;
        bb.markedOffset = copy.markedOffset;
        bb.limit = copy.limit;
        return bb;
    }

    public mark(offset?: any) {
        offset = typeof offset === 'undefined' ? this.offset : offset;
        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength);

        this.markedOffset = offset;
        return this;
    }

    public reset() {
        if (this.markedOffset >= 0) {
            this.offset = this.markedOffset;
            this.markedOffset = -1;
        } else {
            this.offset = 0;
        }
        return this;
    }

    public flip() {
        this.limit = this.offset;
        this.offset = 0;
        return this;
    }

    public static from(buffer: any, encoding?: any): ByteBuffer {
        if (typeof encoding !== 'string') {
            encoding = undefined;
        }
        if (typeof buffer === 'string') {
            if (typeof encoding === 'undefined') encoding = 'utf8';
            switch (encoding) {
                case 'base64':
                    return ByteBuffer.fromBase64(buffer);
                case 'hex':
                    return ByteBuffer.fromHex(buffer);
                case 'binary':
                    return ByteBuffer.fromBinary(buffer);
                case 'utf8':
                    return ByteBuffer.fromUTF8(buffer);
                // case 'debug':
                //     return ByteBuffer.fromDebug(buffer);
                default:
                    throw Error('Unsupported encoding: ' + encoding);
            }
        }
        if (buffer === null || typeof buffer !== 'object') throw TypeError('Illegal buffer');
        let bb;
        if (ByteBuffer.isByteBuffer(buffer)) {
            bb = ByteBuffer.clone(buffer);
            bb.markedOffset = -1;
            return bb;
        }
        if (buffer instanceof Uint8Array) {
            // Extract ArrayBuffer from Uint8Array
            bb = new ByteBuffer(0);
            if (buffer.length > 0) {
                // Avoid references to more than one EMPTY_BUFFER
                bb.buffer = buffer.buffer;
                bb.offset = buffer.byteOffset;
                bb.limit = buffer.byteOffset + buffer.byteLength;
                bb.view = new Uint8Array(buffer.buffer);
            }
        } else if (buffer instanceof ArrayBuffer) {
            // Reuse ArrayBuffer
            bb = new ByteBuffer(0);
            if (buffer.byteLength > 0) {
                bb.buffer = buffer;
                bb.offset = 0;
                bb.limit = buffer.byteLength;
                bb.view = buffer.byteLength > 0 ? new Uint8Array(buffer) : null;
            }
        } else if (Object.prototype.toString.call(buffer) === '[object Array]') {
            // Create from octets
            bb = new ByteBuffer(buffer.length);
            bb.limit = buffer.length;
            for (let i = 0; i < buffer.length; ++i) bb.view[i] = buffer[i];
        } else throw TypeError('Illegal buffer'); // Otherwise fail
        return bb;
    }

    public skip(length) {
        if (typeof length !== 'number' || length % 1 !== 0) throw TypeError('Illegal length: ' + length + ' (not an integer)');
        length |= 0;

        const offset = this.offset + length;
        if (offset < 0 || offset > this.buffer.byteLength) throw RangeError('Illegal length: 0 <= ' + this.offset + ' + ' + length + ' <= ' + this.buffer.byteLength);

        this.offset = offset;
        return this;
    }

    public allocate(capacity?: number) {
        return new ByteBuffer(capacity);
    }

    public append(source: ByteBuffer | Uint8Array | ArrayBuffer | string, encoding?: any, offset?: number) {
        if (typeof encoding === 'number' || typeof encoding !== 'string') {
            offset = encoding;
            encoding = undefined;
        }
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;

        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength);

        if (!(source instanceof ByteBuffer)) source = ByteBuffer.from(source, encoding);
        const length = source.limit - source.offset;
        if (length <= 0) return this; // Nothing to append
        offset += length;
        let capacity16 = this.buffer.byteLength;
        if (offset > capacity16) this.resize((capacity16 *= 2) > offset ? capacity16 : offset);
        offset -= length;
        this.view.set(source.view.subarray(source.offset, source.limit), offset);
        source.offset += length;
        if (relative) this.offset += length;
        return this;
    }

    public concat(buffers, encoding) {
        if (typeof encoding === 'boolean' || typeof encoding !== 'string') {
            encoding = undefined;
        }
        let capacity = 0;
        const k = buffers.length;
        for (let i = 0, length; i < k; ++i) {
            if (!ByteBuffer.isByteBuffer(buffers[i])) buffers[i] = ByteBuffer.from(buffers[i], encoding);
            length = buffers[i].limit - buffers[i].offset;
            if (length > 0) capacity += length;
        }
        if (capacity === 0) return new ByteBuffer(0);
        const bb = new ByteBuffer(capacity);
        let bi;
        let i = 0;
        while (i < k) {
            bi = buffers[i++];
            length = bi.limit - bi.offset;
            if (length <= 0) continue;
            bb.view.set(bi.view.subarray(bi.offset, bi.limit), bb.offset);
            bb.offset += length;
        }
        bb.limit = bb.offset;
        bb.offset = 0;
        return bb;
    }

    public copy(begin = this.offset, end = this.limit) {
        begin = BBAssert.checkBeing(begin);
        begin >>>= 0;
        end = BBAssert.checkEnd(end);
        end >>>= 0;
        if (begin < 0 || begin > end || end > this.buffer.byteLength) throw RangeError('Illegal range: 0 <= ' + begin + ' <= ' + end + ' <= ' + this.buffer.byteLength);

        if (begin === end) return new ByteBuffer(0);
        const capacity = end - begin,
            bb = new ByteBuffer(capacity);
        bb.offset = 0;
        bb.limit = capacity;
        if (bb.markedOffset >= 0) bb.markedOffset -= begin;
        this.copyTo(bb, 0, begin, end);
        return bb;
    }

    public copyTo(target: ByteBuffer, targetOffset: number, sourceOffset: number, sourceLimit: number) {
        let relative, targetRelative;
        if (!ByteBuffer.isByteBuffer(target)) throw TypeError('Illegal target: Not a ByteBuffer');

        targetOffset = (targetRelative = typeof targetOffset === 'undefined') ? target.offset : targetOffset | 0;
        sourceOffset = (relative = typeof sourceOffset === 'undefined') ? this.offset : sourceOffset | 0;
        sourceLimit = typeof sourceLimit === 'undefined' ? this.limit : sourceLimit | 0;

        if (targetOffset < 0 || targetOffset > target.buffer.byteLength) throw RangeError('Illegal target range: 0 <= ' + targetOffset + ' <= ' + target.buffer.byteLength);
        if (sourceOffset < 0 || sourceLimit > this.buffer.byteLength) throw RangeError('Illegal source range: 0 <= ' + sourceOffset + ' <= ' + this.buffer.byteLength);

        const len = sourceLimit - sourceOffset;
        if (len === 0) return target; // Nothing to copy

        target.ensureCapacity(targetOffset + len);

        target.view.set(this.view.subarray(sourceOffset, sourceLimit), targetOffset);

        if (relative) this.offset += len;
        if (targetRelative) target.offset += len;

        return this;
    }

    public ensureCapacity(capacity) {
        let current = this.buffer.byteLength;
        if (current < capacity) return this.resize((current *= 2) > capacity ? current : capacity);
        return this;
    }

    public resize(capacity) {
        if (typeof capacity !== 'number' || capacity % 1 !== 0) throw TypeError('Illegal capacity: ' + capacity + ' (not an integer)');
        capacity |= 0;
        if (capacity < 0) throw RangeError('Illegal capacity: 0 <= ' + capacity);

        if (this.buffer.byteLength < capacity) {
            const buffer = new ArrayBuffer(capacity);
            const view = new Uint8Array(buffer);
            view.set(this.view);
            this.buffer = buffer;
            this.view = view;
        }
        return this;
    }

    public readVString(offset?: any) {
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;
        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength, 1);

        const start = offset;
        const len = this.readVarint32(offset);
        const str = this.readUTF8String(len['value'], (offset += len['length']));
        offset += str['length'];
        if (relative) {
            this.offset = offset;
            return str['string'];
        } else {
            return {
                string: str['string'],
                length: offset - start,
            };
        }
    }

    public writeVString(str, offset?: any) {
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;
        str = BBAssert.checkString(str);
        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength);

        const start = offset;
        const k = utfx.calculateUTF16asUTF8(stringSource(str))[1];
        const l = ByteBuffer.calculateVarint32(k);
        offset += l + k;
        let capacity15 = this.buffer.byteLength;
        if (offset > capacity15) this.resize((capacity15 *= 2) > offset ? capacity15 : offset);
        offset -= l + k;
        offset += this.writeVarint32(k, offset) as any;
        utfx.encodeUTF16toUTF8(stringSource(str), (b) => {
            this.view[offset++] = b;
        });
        if (offset !== start + k + l) throw RangeError('Illegal range: Truncated data, ' + offset + ' == ' + (offset + k + l));
        if (relative) {
            this.offset = offset;
            return this;
        }
        return offset - start;
    }

    public writeByte(value: number, offset?: number) {
        return this.writeInt8(value, offset);
    }

    public writeInt8(value: number, offset?: number) {
        return this.writeUInt8(value, offset);
    }

    public writeUInt8(value: number, offset?: number) {
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;

        if (typeof value !== 'number' || value % 1 !== 0) throw TypeError('Illegal value: ' + value + ' (not an integer)');
        value >>>= 0;
        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength);

        offset += 1;
        let capacity1 = this.buffer.byteLength;
        if (offset > capacity1) this.resize((capacity1 *= 2) > offset ? capacity1 : offset);
        offset -= 1;
        this.view[offset] = value;
        if (relative) this.offset += 1;
        return this;
    }

    public readInt8(offset?: number) {
        let value = this.readUInt16(offset);
        if ((value & 0x80) === 0x80) value = -(0xff - value + 1); // Cast to signed
        return value;
    }

    public readUint8(offset?: number) {
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;

        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength, 1);

        const value = this.view[offset];
        if (relative) this.offset += 1;
        return value;
    }

    public writeInt16(value: number, offset?: number) {
        return this.writeUInt16(value, offset);
    }

    public writeUInt16(value: number, offset?: number) {
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;

        if (typeof value !== 'number' || value % 1 !== 0) throw TypeError('Illegal value: ' + value + ' (not an integer)');
        value >>>= 0;
        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength);

        offset += 2;
        let capacity3 = this.buffer.byteLength;
        if (offset > capacity3) this.resize((capacity3 *= 2) > offset ? capacity3 : offset);
        offset -= 2;
        this.view[offset + 1] = (value & 0xff00) >>> 8;
        this.view[offset] = value & 0x00ff;
        if (relative) this.offset += 2;
        return this;
    }

    public readInt16(offset: number) {
        let value = this.readUInt16(offset);
        if ((value & 0x8000) === 0x8000) value = -(0xffff - value + 1); // Cast to signed
        return value;
    }

    public readUInt16(offset?: number) {
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;

        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength, 2);

        let value = 0;
        value = this.view[offset];
        value |= this.view[offset + 1] << 8;
        if (relative) this.offset += 2;
        return value;
    }

    public writeInt32(value: number, offset?: number) {
        return this.writeUInt32(value, offset);
    }

    public writeUInt32(value: number, offset?: number) {
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;

        if (typeof value !== 'number' || value % 1 !== 0) throw TypeError('Illegal value: ' + value + ' (not an integer)');
        value >>>= 0;
        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength);

        offset += 4;
        let capacity5 = this.buffer.byteLength;
        if (offset > capacity5) this.resize((capacity5 *= 2) > offset ? capacity5 : offset);
        offset -= 4;
        this.view[offset + 3] = (value >>> 24) & 0xff;
        this.view[offset + 2] = (value >>> 16) & 0xff;
        this.view[offset + 1] = (value >>> 8) & 0xff;
        this.view[offset] = value & 0xff;
        if (relative) this.offset += 4;
        return this;
    }

    public readInt32(offset?: number) {
        let value = this.readUInt32(offset);
        value |= 0; // Cast to signed
        return value;
    }

    public readUInt32(offset?: number) {
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;

        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength, 4);

        let value = 0;
        value = this.view[offset + 2] << 16;
        value |= this.view[offset + 1] << 8;
        value |= this.view[offset];
        value += (this.view[offset + 3] << 24) >>> 0;
        if (relative) this.offset += 4;
        return value;
    }

    public writeInt64(value: number, offset?: number) {
        return this.writeUInt64(value, offset);
    }

    public writeUInt64(value: number | string | Long, offset?: number | Long) {
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;
        let longValue = value;
        if (typeof value === 'number') longValue = Long.fromNumber(value);
        else if (typeof value === 'string') longValue = Long.fromString(value);
        else if (!(value && value instanceof Long)) throw TypeError('Illegal value: ' + value + ' (not an integer or Long)');
        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength);

        offset += 8;
        let capacity7 = this.buffer.byteLength;
        if (offset > capacity7) this.resize((capacity7 *= 2) > offset ? capacity7 : offset);
        offset -= 8;
        const lo = longValue.low;
        const hi = longValue.high;
        this.view[offset + 3] = (lo >>> 24) & 0xff;
        this.view[offset + 2] = (lo >>> 16) & 0xff;
        this.view[offset + 1] = (lo >>> 8) & 0xff;
        this.view[offset] = lo & 0xff;
        offset += 4;
        this.view[offset + 3] = (hi >>> 24) & 0xff;
        this.view[offset + 2] = (hi >>> 16) & 0xff;
        this.view[offset + 1] = (hi >>> 8) & 0xff;
        this.view[offset] = hi & 0xff;
        if (relative) this.offset += 8;
        return this;
    }

    public readInt64(offset?: number) {
        return this.readUInt64(offset);
    }

    public readUInt64(offset?: number) {
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;
        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength, 8);

        let lo = 0,
            hi = 0;
        lo = this.view[offset + 2] << 16;
        lo |= this.view[offset + 1] << 8;
        lo |= this.view[offset];
        lo += (this.view[offset + 3] << 24) >>> 0;
        offset += 4;
        hi = this.view[offset + 2] << 16;
        hi |= this.view[offset + 1] << 8;
        hi |= this.view[offset];
        hi += (this.view[offset + 3] << 24) >>> 0;
        const value = new Long(lo, hi, false);
        if (relative) this.offset += 8;
        return value;
    }

    public readVarint32(offset?: number) {
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;
        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength, 1);

        let c = 0,
            value = 0 >>> 0,
            b;
        do {
            if (offset > this.limit) {
                const err = Error('Truncated');
                err['truncated'] = true;
                throw err;
            }
            b = this.view[offset++];
            if (c < 5) value |= (b & 0x7f) << (7 * c);
            ++c;
        } while ((b & 0x80) !== 0);
        value |= 0;
        if (relative) {
            this.offset = offset;
            return value;
        }
        return {
            value: value,
            length: c,
        };
    }

    public writeVarint32(value: number, offset?: number) {
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;

        if (typeof value !== 'number' || value % 1 !== 0) throw TypeError('Illegal value: ' + value + ' (not an integer)');
        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength);

        const size = ByteBuffer.calculateVarint32(value);
        let b;
        offset += size;
        let capacity10 = this.buffer.byteLength;
        if (offset > capacity10) this.resize((capacity10 *= 2) > offset ? capacity10 : offset);
        offset -= size;
        value >>>= 0;
        while (value >= 0x80) {
            b = (value & 0x7f) | 0x80;
            this.view[offset++] = b;
            value >>>= 7;
        }
        this.view[offset++] = value;
        if (relative) {
            this.offset = offset;
            return this;
        }
        return size;
    }

    public readUTF8String(length: number, offset: number) {
        const relative = typeof offset === 'undefined';
        if (relative) offset = this.offset;
        if (typeof length !== 'number' || length % 1 !== 0) throw TypeError('Illegal length: ' + length + ' (not an integer)');
        length |= 0;
        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        offset = BBAssert.checkRange(offset, this.buffer.byteLength);

        const start = offset;
        let sd;

        offset = BBAssert.checkInteger(offset);
        offset >>>= 0;
        if (offset < 0 || offset + length > this.buffer.byteLength) throw RangeError('Illegal offset: 0 <= ' + offset + ' (+' + length + ') <= ' + this.buffer.byteLength);

        const k = offset + length;
        utfx.decodeUTF8toUTF16(() => {
            return offset < k ? this.view[offset++] : null;
        }, (sd = stringDestination()));
        if (offset !== k) throw RangeError('Illegal range: Truncated data, ' + offset + ' == ' + k);
        if (relative) {
            this.offset = offset;
            return sd();
        } else {
            return {
                string: sd(),
                length: offset - start,
            };
        }
    }

    toBuffer(forceCopy?: boolean) {
        let offset = this.offset,
            limit = this.limit;

        if (typeof offset !== 'number' || offset % 1 !== 0) throw TypeError('Illegal offset: Not an integer');
        offset >>>= 0;
        if (typeof limit !== 'number' || limit % 1 !== 0) throw TypeError('Illegal limit: Not an integer');
        limit >>>= 0;
        if (offset < 0 || offset > limit || limit > this.buffer.byteLength) throw RangeError('Illegal range: 0 <= ' + offset + ' <= ' + limit + ' <= ' + this.buffer.byteLength);

        // NOTE: It's not possible to have another ArrayBuffer reference the same memory as the backing buffer. This is
        // possible with Uint8Array#subarray only, but we have to return an ArrayBuffer by contract. So:
        if (!forceCopy && offset === 0 && limit === this.buffer.byteLength) {
            return new Uint8Array(this.buffer);
        }
        if (offset === limit) {
            return EMPTY_BUFFER;
        }
        // const buffer = new ArrayBuffer(limit - offset);

        const buffer = new Uint8Array(this.buffer).subarray(offset, limit);
        new Uint8Array(buffer).set(buffer, 0);
        return buffer;
    }

    public toString(encoding?: string | number, begin?: any, end?: number) {
        if (typeof encoding === 'undefined')
            return 'ByteBufferAB(offset=' + this.offset + ',markedOffset=' + this.markedOffset + ',limit=' + this.limit + ',capacity=' + this.buffer.byteLength + ')';
        if (typeof encoding === 'number') (encoding = 'utf8'), (begin = encoding), (end = begin);
        switch (encoding) {
            case 'utf8':
                return this.toUTF8(begin, end);
            case 'base64':
                return this.toBase64(begin, end);
            case 'hex':
                return this.toHex(begin, end);
            case 'binary':
                return this.toBinary(begin, end);
            default:
                throw Error('Unsupported encoding: ' + encoding);
        }
    }

    public toUTF8(begin = this.offset, end = this.limit) {
        begin = BBAssert.checkBeing(begin);
        begin >>>= 0;
        end = BBAssert.checkEnd(end);
        end >>>= 0;
        if (begin < 0 || begin > end || end > this.buffer.byteLength) throw RangeError('Illegal range: 0 <= ' + begin + ' <= ' + end + ' <= ' + this.buffer.byteLength);

        let sd;
        try {
            utfx.decodeUTF8toUTF16(() => {
                return begin < end ? this.view[begin++] : null;
            }, (sd = stringDestination()));
        } catch (e) {
            if (begin !== end) throw RangeError('Illegal range: Truncated data, ' + begin + ' != ' + end);
        }
        return sd();
    }

    public toBase64(begin = this.offset || 0, end = this.limit || 0) {
        if (begin < 0 || end > this.capacity || begin > end) throw RangeError('begin, end');
        let sd;
        lxiv.encode(() => {
            return begin < end ? this.view[begin++] : null;
        }, (sd = stringDestination()));
        return sd();
    }

    public toHex(begin = this.offset, end = this.limit) {
        begin = BBAssert.checkBeing(begin);
        begin >>>= 0;
        end = BBAssert.checkEnd(end);
        end >>>= 0;
        if (begin < 0 || begin > end || end > this.buffer.byteLength) throw RangeError('Illegal range: 0 <= ' + begin + ' <= ' + end + ' <= ' + this.buffer.byteLength);

        const out = new Array(end - begin);
        let b;
        while (begin < end) {
            b = this.view[begin++];
            if (b < 0x10) out.push('0', b.toString(16));
            else out.push(b.toString(16));
        }
        return out.join('');
    }

    public toBinary(begin = this.offset, end = this.limit) {
        if (typeof begin === 'undefined') begin = this.offset;
        if (typeof end === 'undefined') end = this.limit;
        begin |= 0;
        end |= 0;
        if (begin < 0 || end > this.buffer.byteLength || begin > end) throw RangeError('begin, end');
        if (begin === end) return '';
        let chars: any[] = [];
        const parts: any[] = [];
        while (begin < end) {
            chars.push(this.view[begin++]);
            // eslint-disable-next-line prefer-spread
            if (chars.length >= 1024) parts.push(String.fromCharCode.apply(String, chars)), (chars = []);
        }
        // eslint-disable-next-line prefer-spread
        return parts.join('') + String.fromCharCode.apply(String, chars);
    }

    private __isByteBuffer__ = true;

    public static isByteBuffer(bb) {
        return bb && bb.__isByteBuffer__;
    }
}

class BBAssert {
    static checkInteger(value: any, name = 'offset') {
        if (typeof value !== 'number' || value % 1 !== 0) throw TypeError(`Illegal offset: ${name}` + value + ' (not an integer)');
        return value as number;
    }

    static checkRange(value: any, value2: any, additionalNumber = 0, name = 'offset') {
        if (value < 0 || value + additionalNumber > value2) throw RangeError(`Illegal ${name}: 0 <= ` + value + ' (+' + additionalNumber + ') <= ' + value2);
        return value as number;
    }

    static checkBeing(begin?: any) {
        if (typeof begin !== 'number' || begin % 1 !== 0) throw TypeError('Illegal begin: Not an integer');
        return begin as number;
    }

    static checkEnd(end?: any) {
        if (typeof end !== 'number' || end % 1 !== 0) throw TypeError('Illegal end: Not an integer');
        return end as number;
    }

    static checkString(str?: any) {
        if (typeof str !== 'string') throw TypeError('Illegal str: Not a string');
        return str as string;
    }
}

const stringSource = (s) => {
    let i = 0;
    return function () {
        return i < s.length ? s.charCodeAt(i++) : null;
    };
};

const stringFromCharCode = String.fromCharCode;

const stringDestination = () => {
    const cs: any[] = [],
        ps: any[] = [];
    // Has to be a function not an array function
    return function () {
        if (arguments.length === 0) return ps.join('') + stringFromCharCode.apply(String, cs);
        if (cs.length + arguments.length > 1024) ps.push(stringFromCharCode.apply(String, cs)), (cs.length = 0);
        // eslint-disable-next-line prefer-rest-params
        Array.prototype.push.apply(cs, arguments as any);
        return;
    };
};
