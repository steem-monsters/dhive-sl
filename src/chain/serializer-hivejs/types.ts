// Originally from hive-js - https://gitlab.syncad.com/hive/hive-js

import assert from 'assert';
import { ObjectId } from './objectid';
import { FastParser } from './fastparser.hivejs';
import validations from './validations';
import { ChainTypes } from './chaintypes';
import { PublicKeyHiveJs } from './publickey';
import { DEFAULT_ADDRESS_PREFIX } from '../../constants';

// /**
//     Convert 12.34 with a precision of 3 into 12340

//     @arg {number|string} number - Use strings for large numbers.  This may contain one decimal but no sign
//     @arg {number} precision - number of implied decimal places (usually causes right zero padding)
//     @return {string} -
// */
// const toImpliedDecimal = (number, precision) => {
//     if (typeof number === 'number') {
//         assert(number <= 9007199254740991, 'overflow');
//         number = '' + number;
//     } else if (number.toString) number = number.toString();

//     assert(typeof number === 'string', 'number should be an actual number or string: ' + typeof number);
//     number = number.trim();
//     assert(/^[0-9]*\.?[0-9]*$/.test(number), 'Invalid decimal number ' + number);

//     let [whole = '', decimal = ''] = number.split('.');

//     const padding = precision - decimal.length;
//     assert(padding >= 0, 'Too many decimal digits in ' + number + ' to create an implied decimal of ' + precision);

//     for (let i = 0; i < padding; i++) decimal += '0';

//     while (whole.charAt(0) === '0') whole = whole.substring(1);

//     return whole + decimal;
// };

const fromImpliedDecimal = (number, precision) => {
    if (typeof number === 'number') {
        assert(number <= 9007199254740991, 'overflow');
        number = '' + number;
    } else if (number.toString) number = number.toString();

    while (number.length < precision + 1)
        // 0.123
        number = '0' + number;

    // 44000 => 44.000
    const dec_string = number.substring(number.length - precision);
    return number.substring(0, number.length - precision) + (dec_string ? '.' + dec_string : '');
};

const MIN_SIGNED_32 = -1 * Math.pow(2, 31);
const MAX_SIGNED_32 = Math.pow(2, 31) - 1;
/* Supports instance numbers (11) or object types (1.2.11).  Object type
validation is enforced when an object type is used. */
const id_type = function (reserved_spaces, object_type) {
    validations.required(reserved_spaces, 'reserved_spaces');
    validations.required(object_type, 'object_type');
    return {
        fromByteBuffer(b) {
            return b.readVarint32();
        },
        appendByteBuffer(b, object) {
            validations.required(object);
            if (object.resolve !== undefined) {
                object = object.resolve;
            }
            // convert 1.2.n into just n
            if (/^[0-9]+\.[0-9]+\.[0-9]+$/.test(object)) {
                object = validations.get_instance(reserved_spaces, object_type, object);
            }
            b.writeVarint32(validations.to_number(object));
            return;
        },
        fromObject(object) {
            validations.required(object);
            if (object.resolve !== undefined) {
                object = object.resolve;
            }
            if (validations.is_digits(object)) {
                return validations.to_number(object);
            }
            return validations.get_instance(reserved_spaces, object_type, object);
        },
        toObject(object, debug: any = {}) {
            const object_type_id = ChainTypes.object_type[object_type];
            if (debug.use_default && object === undefined) {
                return `${reserved_spaces}.${object_type_id}.0`;
            }
            validations.required(object);
            if (object.resolve !== undefined) {
                object = object.resolve;
            }
            if (/^[0-9]+\.[0-9]+\.[0-9]+$/.test(object)) {
                object = validations.get_instance(reserved_spaces, object_type, object);
            }

            return `${reserved_spaces}.${object_type_id}.` + object;
        },
    };
};

const HEX_DUMP = process.env.npm_config__graphene_serializer_hex_dump;

// Highly optimized implementation of Damm algorithm
// https://en.wikipedia.org/wiki/Damm_algorithm
function damm_checksum_8digit(value) {
    if (value >= 100000000) throw new Error('Expected value less than 100000000, instead got ' + value);

    const t = [
        0, 30, 10, 70, 50, 90, 80, 60, 40, 20, 70, 0, 90, 20, 10, 50, 40, 80, 60, 30, 40, 20, 0, 60, 80, 70, 10, 30, 50, 90, 10, 70, 50, 0, 90, 80, 30, 40, 20, 60, 60, 10, 20, 30,
        0, 40, 50, 90, 70, 80, 30, 60, 70, 40, 20, 0, 90, 50, 80, 10, 50, 80, 60, 90, 70, 20, 0, 10, 30, 40, 80, 90, 40, 50, 30, 60, 20, 0, 10, 70, 90, 40, 30, 80, 60, 10, 70, 20,
        0, 50, 20, 50, 80, 10, 40, 30, 60, 70, 90, 0,
    ];

    const q0 = value / 10;
    const d0 = value % 10;
    const q1 = q0 / 10;
    const d1 = q0 % 10;
    const q2 = q1 / 10;
    const d2 = q1 % 10;
    const q3 = q2 / 10;
    const d3 = q2 % 10;
    const q4 = q3 / 10;
    const d4 = q3 % 10;
    const q5 = q4 / 10;
    const d5 = q4 % 10;
    const d6 = q5 % 10;
    const d7 = q5 / 10;

    let x = t[d7];
    x = t[x + d6];
    x = t[x + d5];
    x = t[x + d4];
    x = t[x + d3];
    x = t[x + d2];
    x = t[x + d1];
    x = t[x + d0];

    return x / 10;
}

/**
 * Asset symbols contain the following information
 *
 *  4 bit PRECISION
 *  4 bit RESERVED
 *  CHAR[6] up to 6 upper case alpha numeric ascii characters,
 *  char = \0  null terminated
 *
 *  It is treated as a uint64_t for all internal operations, but
 *  is easily converted to something that can be displayed.
 *
 *  Legacy serialization of assets
 *  0000pppp aaaaaaaa bbbbbbbb cccccccc dddddddd eeeeeeee ffffffff 00000000
 *  Symbol = abcdef
 *
 *  NAI serialization of assets
 *  aaa1pppp bbbbbbbb cccccccc dddddddd
 *  NAI = (MSB to LSB) dddddddd cccccccc bbbbbbbb aaa
 *
 *  NAI internal storage of legacy assets
 */
export const Types = {
    asset: {
        fromByteBuffer(b) {
            const amount = b.readInt64();
            let precision = b.readUint8();
            let amount_string = '';
            let symbol = '';

            if (precision >= 16) {
                // NAI Case
                const b_copy = b.copy(b.offset - 1, b.offset + 3);
                // @ts-ignore
                let nai = Buffer.from(b_copy.toBinary(), 'binary').readInt32();
                nai = nai / 32;
                symbol = '@@' + nai.toString().padStart(8, '0') + damm_checksum_8digit(nai).toString();
                precision = precision % 16;
                b.skip(3);
                amount_string = fromImpliedDecimal(amount, precision);
            } else {
                // Legacy Case
                const b_copy = b.copy(b.offset, b.offset + 7);
                symbol = Buffer.from(b_copy.toBinary(), 'binary').toString().replace(/\x00/g, '');
                b.skip(7);
                // "1.000 HIVE" always written with full precision
                amount_string = fromImpliedDecimal(amount, precision);
            }

            return amount_string + ' ' + symbol;
        },
        appendByteBuffer(b, object, addressPrefix = DEFAULT_ADDRESS_PREFIX) {
            let amount = '';
            let symbol = '';
            let nai = 0;
            let precision = 0;

            if (object['nai']) {
                symbol = object['nai'];
                nai = parseInt(symbol.slice(2));
                // const checksum = nai % 10;
                nai = Math.floor(nai / 10);
                // const expected_checksum = damm_checksum_8digit(nai);

                switch (object['nai']) {
                    case '@@000000021':
                        precision = 3;
                        symbol = addressPrefix == 'STM' ? 'STEEM' : 'TESTS';
                        break;
                    case '@@000000013':
                        precision = 3;
                        symbol = addressPrefix == 'STM' ? 'SBD' : 'TBD';
                        break;
                    case '@@000000037':
                        precision = 6;
                        symbol = 'VESTS';
                        break;
                }

                precision = parseInt(object['precision']);
                b.writeInt64(validations.to_long(parseInt(object['amount'])));
            } else {
                object = object.trim();
                if (!/^[0-9]+\.?[0-9]* [A-Za-z0-9@]+$/.test(object)) throw new Error("Expecting amount like '99.000 SYMBOL', instead got '" + object + "'");

                const res = object.split(' ');
                amount = res[0];
                symbol = res[1];

                // Hive workaround for now
                symbol = symbol == 'HIVE' ? 'STEEM' : symbol == 'HBD' ? 'SBD' : symbol;

                if (symbol.startsWith('@@')) {
                    // NAI Case
                    nai = parseInt(symbol.slice(2));
                    // const checksum = nai % 10;
                    nai = Math.floor(nai / 10);
                    // const expected_checksum = damm_checksum_8digit(nai);
                } else if (symbol.length > 6) throw new Error('Symbols are not longer than 6 characters ' + symbol + '-' + symbol.length);

                b.writeInt64(validations.to_long(amount.replace('.', '')));
                const dot = amount.indexOf('.'); // 0.000
                precision = dot === -1 ? 0 : amount.length - dot - 1;
            }

            if (symbol.startsWith('@@')) {
                nai = (nai << 5) + 16 + precision;
                b.writeUint32(nai);
            } else {
                b.writeUint8(precision);
                b.append(symbol.toUpperCase(), 'binary');
                for (let i = 0; i < 7 - symbol.length; i++) b.writeUint8(0);
            }

            return;
        },
        fromObject(object) {
            return object;
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return '0.000 HIVE';
            }
            return object;
        },
    },
    asset_symbol: {
        fromByteBuffer(b) {
            let precision = b.readUint8();
            // const amount_string = '';
            let nai_string = '';

            if (precision >= 16) {
                // NAI Case
                const b_copy = b.copy(b.offset - 1, b.offset + 3);
                // @ts-ignore
                let nai = Buffer.from(b_copy.toBinary(), 'binary').readInt32();
                nai = nai / 32;
                nai_string = '@@' + nai.toString().padStart(8, '0') + damm_checksum_8digit(nai).toString();
                precision = precision % 16;
                b.skip(3);
            } else {
                // Legacy Case
                const b_copy = b.copy(b.offset, b.offset + 7);
                const symbol = Buffer.from(b_copy.toBinary(), 'binary').toString().replace(/\x00/g, '');
                if (symbol == 'STEEM' || symbol == 'TESTS') nai_string = '@@000000021';
                else if (symbol == 'SBD' || symbol == 'TBD') nai_string = '@@000000013';
                else if (symbol == 'VESTS') nai_string = '@@000000037';
                else throw new Error("Expecting non-smt core asset symbol, instead got '" + symbol + "'");
                b.skip(7);
            }

            return { nai: nai_string, precision: precision };
        },
        appendByteBuffer(b, object, addressPrefix = DEFAULT_ADDRESS_PREFIX) {
            let nai = 0;
            if (!object['nai'].startsWith('@@')) throw new Error("Asset Symbols NAIs must be prefixed with '@@'. Was " + object['nai']);

            nai = parseInt(object['nai'].slice(2));
            // const checksum = nai % 10;
            nai = Math.floor(nai / 10);
            // const expected_checksum = damm_checksum_8digit(nai);

            let precision = 0;
            let symbol = '';
            switch (object['nai']) {
                case '@@000000021':
                    precision = 3;
                    symbol = addressPrefix == 'STM' ? 'STEEM' : 'TESTS';
                    break;
                case '@@000000013':
                    precision = 3;
                    symbol = addressPrefix == 'STM' ? 'SBD' : 'TBD';
                    break;
                case '@@000000037':
                    precision = 6;
                    symbol = 'VESTS';
                    break;
            }

            if (precision > 0) {
                //Core Symbol Case
                b.writeUint8(precision);
                b.append(symbol, 'binary');
                for (let i = 0; i < 7 - symbol.length; i++) b.writeUint8(0);
            } else {
                nai = (nai << 5) + 16 + object['precision'];
                b.writeUint32(nai);
            }

            return;
        },
        fromObject(object) {
            return object;
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return 'STEEM';
            }
            return object;
        },
    },
    uint8: {
        fromByteBuffer(b) {
            return b.readUint8();
        },
        appendByteBuffer(b, object) {
            validations.require_range(0, 0xff, object, `uint8 ${object}`);
            b.writeUint8(object);
            return;
        },
        fromObject(object) {
            validations.require_range(0, 0xff, object, `uint8 ${object}`);
            return object;
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return 0;
            }
            validations.require_range(0, 0xff, object, `uint8 ${object}`);
            return parseInt(object);
        },
    },
    uint16: {
        fromByteBuffer(b) {
            return b.readUint16();
        },
        appendByteBuffer(b, object) {
            validations.require_range(0, 0xffff, object, `uint16 ${object}`);
            b.writeUint16(object);
            return;
        },
        fromObject(object) {
            validations.require_range(0, 0xffff, object, `uint16 ${object}`);
            return object;
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return 0;
            }
            validations.require_range(0, 0xffff, object, `uint16 ${object}`);
            return parseInt(object);
        },
    },
    uint32: {
        fromByteBuffer(b) {
            return b.readUint32();
        },
        appendByteBuffer(b, object) {
            validations.require_range(0, 0xffffffff, object, `uint32 ${object}`);
            b.writeUint32(object);
            return;
        },
        fromObject(object) {
            validations.require_range(0, 0xffffffff, object, `uint32 ${object}`);
            return object;
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return 0;
            }
            validations.require_range(0, 0xffffffff, object, `uint32 ${object}`);
            return parseInt(object);
        },
    },
    varint32: {
        fromByteBuffer(b) {
            return b.readVarint32();
        },
        appendByteBuffer(b, object) {
            validations.require_range(MIN_SIGNED_32, MAX_SIGNED_32, object, `uint32 ${object}`);
            b.writeVarint32(object);
            return;
        },
        fromObject(object) {
            validations.require_range(MIN_SIGNED_32, MAX_SIGNED_32, object, `uint32 ${object}`);
            return object;
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return 0;
            }
            validations.require_range(MIN_SIGNED_32, MAX_SIGNED_32, object, `uint32 ${object}`);
            return parseInt(object);
        },
    },
    int16: {
        fromByteBuffer(b) {
            return b.readInt16();
        },
        appendByteBuffer(b, object) {
            b.writeInt16(object);
            return;
        },
        fromObject(object) {
            return object;
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return 0;
            }
            return parseInt(object);
        },
    },
    int64: {
        fromByteBuffer(b) {
            return b.readInt64();
        },
        appendByteBuffer(b, object) {
            validations.required(object);
            b.writeInt64(validations.to_long(object));
            return;
        },
        fromObject(object) {
            validations.required(object);
            return validations.to_long(object);
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return '0';
            }
            validations.required(object);
            return validations.to_long(object).toString();
        },
    },
    uint64: {
        fromByteBuffer(b) {
            return b.readUint64();
        },
        appendByteBuffer(b, object) {
            b.writeUint64(validations.to_long(validations.unsigned(object)));
            return;
        },
        fromObject(object) {
            return validations.to_long(validations.unsigned(object));
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return '0';
            }
            return validations.to_long(object).toString();
        },
    },
    uint128: {
        fromByteBuffer(b) {
            b.readBigInt64();
            return b.readBigInt64();
        },
        appendByteBuffer(b, object) {
            b.writeUint64(validations.to_long(validations.unsigned(0)));
            b.writeUint64(validations.to_long(validations.unsigned(object)));
            return;
        },
        fromObject(object) {
            return validations.to_long(validations.unsigned(object));
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return '0';
            }
            return validations.to_long(object).toString();
        },
    },
    string: {
        fromByteBuffer(b) {
            return Buffer.from(b.readVString(), 'utf8');
        },
        appendByteBuffer(b, object) {
            validations.required(object);
            b.writeVString(object.toString());
            return;
        },
        fromObject(object) {
            validations.required(object);
            return Buffer.from(object, 'utf8');
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return '';
            }
            return object.toString('utf8');
        },
    },
    stringBinary: {
        fromByteBuffer(b) {
            let b_copy;
            const len = b.readVarint32();
            (b_copy = b.copy(b.offset, b.offset + len)), b.skip(len);
            return Buffer.from(b_copy.toBinary(), 'binary');
        },
        appendByteBuffer(b, object) {
            b.writeVarint32(object.length);
            b.append(object.toString('binary'), 'binary');
            return;
        },
        fromObject(object) {
            validations.required(object);
            return Buffer.from(object);
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return '';
            }
            return object.toString();
        },
    },
    bytes: function (size) {
        return {
            fromByteBuffer(b) {
                let b_copy;
                if (size === undefined) {
                    const len = b.readVarint32();
                    (b_copy = b.copy(b.offset, b.offset + len)), b.skip(len);
                    return Buffer.from(b_copy.toBinary(), 'binary');
                } else {
                    (b_copy = b.copy(b.offset, b.offset + size)), b.skip(size);
                    return Buffer.from(b_copy.toBinary(), 'binary');
                }
            },
            appendByteBuffer(b, object) {
                validations.required(object);
                if (typeof object === 'string') object = Buffer.from(object, 'hex');

                if (size === undefined) {
                    b.writeVarint32(object.length);
                }
                b.append(object.toString('binary'), 'binary');
                return;
            },
            fromObject(object) {
                validations.required(object);
                if (Buffer.isBuffer(object)) return object;

                return Buffer.from(object, 'hex');
            },
            toObject(object, debug: any = {}) {
                if (debug.use_default && object === undefined) {
                    const zeros = function (num) {
                        return new Array(num).join('00');
                    };
                    return zeros(size);
                }
                validations.required(object);
                return object.toString('hex');
            },
        };
    },
    bool: {
        fromByteBuffer(b) {
            return b.readUint8() === 1;
        },
        appendByteBuffer(b, object) {
            // supports boolean or integer
            b.writeUint8(JSON.parse(object) ? 1 : 0);
            return;
        },
        fromObject(object) {
            return JSON.parse(object) ? true : false;
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return false;
            }
            return JSON.parse(object) ? true : false;
        },
    },
    void: {
        fromByteBuffer() {
            throw new Error('(void) undefined type');
        },
        appendByteBuffer() {
            throw new Error('(void) undefined type');
        },
        fromObject() {
            throw new Error('(void) undefined type');
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return undefined;
            }
            throw new Error('(void) undefined type');
        },
    },
    array: function (st_operation) {
        return {
            fromByteBuffer(b) {
                const size = b.readVarint32();
                if (HEX_DUMP) {
                    console.log('varint32 size = ' + size.toString(16));
                }
                const result: any = [];
                for (let i = 0; 0 < size ? i < size : i > size; 0 < size ? i++ : i++) {
                    result.push(st_operation.fromByteBuffer(b));
                }
                return sortOperation(result, st_operation);
            },
            appendByteBuffer(b, object) {
                validations.required(object);
                object = sortOperation(object, st_operation);
                b.writeVarint32(object.length);
                for (let i = 0, o; i < object.length; i++) {
                    o = object[i];
                    st_operation.appendByteBuffer(b, o);
                }
            },
            fromObject(object) {
                validations.required(object);
                object = sortOperation(object, st_operation);
                const result: any = [];
                for (let i = 0, o; i < object.length; i++) {
                    o = object[i];
                    result.push(st_operation.fromObject(o));
                }
                return result;
            },
            toObject(object, debug: any = {}) {
                if (debug.use_default && object === undefined) {
                    return [st_operation.toObject(object, debug)];
                }
                validations.required(object);
                object = sortOperation(object, st_operation);

                const result: any = [];
                for (let i = 0, o; i < object.length; i++) {
                    o = object[i];
                    result.push(st_operation.toObject(o, debug));
                }
                return result;
            },
        };
    },
    time_point_sec: {
        fromByteBuffer(b) {
            return b.readUint32();
        },
        appendByteBuffer(b, object) {
            if (typeof object !== 'number') object = Types.time_point_sec.fromObject(object);

            b.writeUint32(object);
            return;
        },
        fromObject(object) {
            validations.required(object);

            if (typeof object === 'number') return object;

            if (object.getTime) return Math.floor(object.getTime() / 1000);

            if (typeof object !== 'string') throw new Error('Unknown date type: ' + object);

            if (typeof object === 'string' && !/Z$/.test(object)) object = object + 'Z';

            return Math.floor(new Date(object).getTime() / 1000);
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) return new Date(0).toISOString().split('.')[0];

            validations.required(object);

            if (typeof object === 'string') return object;

            if (object.getTime) return object.toISOString().split('.')[0];

            const int = parseInt(object);
            validations.require_range(0, 0xffffffff, int, `uint32 ${object}`);
            return new Date(int * 1000).toISOString().split('.')[0];
        },
    },
    set: function (st_operation) {
        return {
            validate(array) {
                const dup_map = {};
                for (let i = 0, o; i < array.length; i++) {
                    o = array[i];
                    let ref;
                    if (((ref = typeof o), ['string', 'number'].indexOf(ref) >= 0)) {
                        if (dup_map[o] !== undefined) {
                            throw new Error('duplicate (set)');
                        }
                        dup_map[o] = true;
                    }
                }
                return sortOperation(array, st_operation);
            },
            fromByteBuffer(b) {
                const size = b.readVarint32();
                if (HEX_DUMP) {
                    console.log('varint32 size = ' + size.toString(16));
                }
                return this.validate(
                    (() => {
                        const result: any = [];
                        for (let i = 0; 0 < size ? i < size : i > size; 0 < size ? i++ : i++) {
                            result.push(st_operation.fromByteBuffer(b));
                        }
                        return result;
                    })(),
                );
            },
            appendByteBuffer(b, object) {
                if (!object) {
                    object = [];
                }
                b.writeVarint32(object.length);
                const iterable = this.validate(object);
                for (let i = 0, o; i < iterable.length; i++) {
                    o = iterable[i];
                    st_operation.appendByteBuffer(b, o);
                }
                return;
            },
            fromObject(object) {
                if (!object) {
                    object = [];
                }
                return this.validate(
                    (() => {
                        const result: any = [];
                        for (let i = 0, o; i < object.length; i++) {
                            o = object[i];
                            result.push(st_operation.fromObject(o));
                        }
                        return result;
                    })(),
                );
            },
            toObject(object, debug: any = {}) {
                if (debug.use_default && object === undefined) {
                    return [st_operation.toObject(object, debug)];
                }
                if (!object) {
                    object = [];
                }
                return this.validate(
                    (() => {
                        const result: any = [];
                        for (let i = 0, o; i < object.length; i++) {
                            o = object[i];
                            result.push(st_operation.toObject(o, debug));
                        }
                        return result;
                    })(),
                );
            },
        };
    },
    fixed_array: function (count, st_operation) {
        return {
            fromByteBuffer: function (b) {
                let j, ref;
                const results: any[] = [];
                for (j = 0, ref = count; j < ref; j += 1) {
                    results.push(st_operation.fromByteBuffer(b));
                }
                return sortOperation(results, st_operation);
            },
            appendByteBuffer: function (b, object) {
                let i, j, ref;
                if (count !== 0) {
                    validations.required(object);
                    object = sortOperation(object, st_operation);
                }
                for (i = j = 0, ref = count; j < ref; i = j += 1) {
                    st_operation.appendByteBuffer(b, object[i]);
                }
            },
            fromObject: function (object) {
                let i, j, ref;
                if (count !== 0) {
                    validations.required(object);
                }
                const results: any[] = [];
                for (i = j = 0, ref = count; j < ref; i = j += 1) {
                    results.push(st_operation.fromObject(object[i]));
                }
                return results;
            },
            toObject: function (object, debug) {
                let i, j, k, ref, ref1, results;
                if (debug == null) {
                    debug = {};
                }
                if (debug.use_default && object === void 0) {
                    results = [];
                    for (i = j = 0, ref = count; j < ref; i = j += 1) {
                        results.push(st_operation.toObject(void 0, debug));
                    }
                    return results;
                }
                if (count !== 0) {
                    validations.required(object);
                }
                const results1: any[] = [];
                for (i = k = 0, ref1 = count; k < ref1; i = k += 1) {
                    results1.push(st_operation.toObject(object[i], debug));
                }
                return results1;
            },
        };
    },
    protocol_id_type: function (name) {
        validations.required(name, 'name');
        return id_type(ChainTypes.reserved_spaces.protocol_ids, name);
    },
    object_id_type: {
        fromByteBuffer(b) {
            return ObjectId.fromByteBuffer(b);
        },
        appendByteBuffer(b, object) {
            validations.required(object);
            if (object.resolve !== undefined) {
                object = object.resolve;
            }
            object = ObjectId.fromString(object);
            object.appendByteBuffer(b);
            return;
        },
        fromObject(object) {
            validations.required(object);
            if (object.resolve !== undefined) {
                object = object.resolve;
            }
            return ObjectId.fromString(object);
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return '0.0.0';
            }
            validations.required(object);
            if (object.resolve !== undefined) {
                object = object.resolve;
            }
            object = ObjectId.fromString(object);
            return object.toString();
        },
    },
    vote_id: {
        TYPE: 0x000000ff,
        ID: 0xffffff00,
        fromByteBuffer(b) {
            const value = b.readUint32();
            return {
                type: value & this.TYPE,
                id: value & this.ID,
            };
        },
        appendByteBuffer(b, object) {
            validations.required(object);
            if (object === 'string') object = Types.vote_id.fromObject(object);

            const value = (object.id << 8) | object.type;
            b.writeUint32(value);
            return;
        },
        fromObject(object) {
            validations.required(object, '(type vote_id)');
            if (typeof object === 'object') {
                validations.required(object.type, 'type');
                validations.required(object.id, 'id');
                return object;
            }
            validations.require_test(/^[0-9]+:[0-9]+$/, object, `vote_id format ${object}`);
            const [type, id] = object.split(':');
            validations.require_range(0, 0xff, type, `vote type ${object}`);
            validations.require_range(0, 0xffffff, id, `vote id ${object}`);
            return { type, id };
        },
        toObject(object, debug: any = {}) {
            if (debug.use_default && object === undefined) {
                return '0:0';
            }
            validations.required(object);
            if (typeof object === 'string') object = Types.vote_id.fromObject(object);

            return object.type + ':' + object.id;
        },
        compare(a, b) {
            if (typeof a !== 'object') a = Types.vote_id.fromObject(a);
            if (typeof b !== 'object') b = Types.vote_id.fromObject(b);
            return parseInt(a.id) - parseInt(b.id);
        },
    },
    optional: function (st_operation) {
        validations.required(st_operation, 'st_operation');
        return {
            fromByteBuffer(b) {
                if (!(b.readUint8() === 1)) {
                    return undefined;
                }
                return st_operation.fromByteBuffer(b);
            },
            appendByteBuffer(b, object) {
                if (object !== null && object !== undefined) {
                    b.writeUint8(1);
                    st_operation.appendByteBuffer(b, object);
                } else {
                    b.writeUint8(0);
                }
                return;
            },
            fromObject(object) {
                if (object === undefined) {
                    return undefined;
                }
                return st_operation.fromObject(object);
            },
            toObject(object, debug: any = {}) {
                // toObject is only null save if use_default is true
                let result_object = (() => {
                    if (!debug.use_default && object === undefined) {
                        return undefined;
                    } else {
                        return st_operation.toObject(object, debug);
                    }
                })();

                if (debug.annotate) {
                    if (typeof result_object === 'object') {
                        result_object.__optional = 'parent is optional';
                    } else {
                        result_object = { __optional: result_object };
                    }
                }
                return result_object;
            },
        };
    },
    static_variant: function (_st_operations) {
        return {
            nosort: true,
            st_operations: _st_operations,
            opTypeId(value) {
                let pos = 0,
                    type_id;
                if (typeof value === 'number') type_id = value;
                else {
                    for (const op of this.st_operations) {
                        if (op.operation_name === value) {
                            type_id = pos;
                            break;
                        }
                        pos++;
                    }
                }
                return type_id;
            },
            fromByteBuffer(b) {
                const type_id = b.readVarint32();
                const st_operation = this.st_operations[type_id];
                if (HEX_DUMP) {
                    console.error(`static_variant id 0x${type_id.toString(16)} (${type_id})`);
                }
                validations.required(st_operation, `operation ${type_id}`);
                return [type_id, st_operation.fromByteBuffer(b)];
            },
            appendByteBuffer(b, object) {
                validations.required(object);
                const type_id = this.opTypeId(object[0]);
                const st_operation = this.st_operations[type_id];
                validations.required(st_operation, `operation ${type_id}`);
                b.writeVarint32(type_id);
                st_operation.appendByteBuffer(b, object[1]);
                return;
            },
            fromObject(object) {
                validations.required(object);
                const type_id = this.opTypeId(object[0]);
                const st_operation = this.st_operations[type_id];
                validations.required(st_operation, `operation ${type_id}`);
                return [type_id, st_operation.fromObject(object[1])];
            },
            toObject(object, debug: any = {}) {
                if (debug.use_default && object === undefined) {
                    return [this.st_operations[0].operation_name, this.st_operations[0].toObject(undefined, debug)];
                }
                validations.required(object);
                const type_id = this.opTypeId(object[0]);
                const st_operation = this.st_operations[type_id];
                validations.required(st_operation, `operation ${type_id}`);
                return [st_operation.operation_name, st_operation.toObject(object[1], debug)];
            },
            compare(a, b) {
                return strCmp(this.opTypeId(a[0]), this.opTypeId(b[0]));
            },
        };
    },
    map: function (key_st_operation, value_st_operation) {
        return {
            validate(array) {
                if (!Array.isArray(array)) {
                    throw new Error('expecting array');
                }
                const dup_map = {};
                for (let i = 0, o; i < array.length; i++) {
                    o = array[i];
                    let ref;
                    if (!(o.length === 2)) {
                        throw new Error('expecting two elements');
                    }
                    if (((ref = typeof o[0]), ['number', 'string'].indexOf(ref) >= 0)) {
                        if (dup_map[o[0]] !== undefined) {
                            throw new Error('duplicate (map)');
                        }
                        dup_map[o[0]] = true;
                    }
                }
                return sortOperation(array, key_st_operation);
            },

            fromByteBuffer(b) {
                const result: any = [];
                const end = b.readVarint32();
                for (let i = 0; 0 < end ? i < end : i > end; 0 < end ? i++ : i++) {
                    result.push([key_st_operation.fromByteBuffer(b), value_st_operation.fromByteBuffer(b)]);
                }
                return this.validate(result);
            },

            appendByteBuffer(b, object) {
                this.validate(object);
                b.writeVarint32(object.length);
                for (let i = 0, o; i < object.length; i++) {
                    o = object[i];
                    key_st_operation.appendByteBuffer(b, o[0]);
                    value_st_operation.appendByteBuffer(b, o[1]);
                }
                return;
            },
            fromObject(object) {
                validations.required(object);
                const result: any = [];
                for (let i = 0, o; i < object.length; i++) {
                    o = object[i];
                    result.push([key_st_operation.fromObject(o[0]), value_st_operation.fromObject(o[1])]);
                }
                return this.validate(result);
            },
            toObject(object, debug: any = {}) {
                if (debug.use_default && object === undefined) {
                    return [[key_st_operation.toObject(undefined, debug), value_st_operation.toObject(undefined, debug)]];
                }
                validations.required(object);
                object = this.validate(object);
                const result: any = [];
                for (let i = 0, o; i < object.length; i++) {
                    o = object[i];
                    result.push([key_st_operation.toObject(o[0], debug), value_st_operation.toObject(o[1], debug)]);
                }
                return result;
            },
        };
    },
    publicKey: {
        toPublic(object) {
            if (object.resolve !== undefined) {
                object = object.resolve;
            }
            return object == null ? object : object.Q ? object : PublicKeyHiveJs.fromStringOrThrow(object);
        },
        fromByteBuffer(b) {
            return FastParser.publicKey(b);
        },
        appendByteBuffer(b, object) {
            validations.required(object);
            FastParser.publicKey(b, Types.publicKey.toPublic(object));
            return;
        },
        fromObject(object) {
            validations.required(object);
            if (object.Q) {
                return object;
            }
            return Types.publicKey.toPublic(object);
        },
        toObject(object, debug: any = {}, addressPrefix = DEFAULT_ADDRESS_PREFIX) {
            if (debug.use_default && object === undefined) {
                return addressPrefix + '859gxfnXyUriMgUeThh1fWv3oqcpLFyHa3TfFYC4PK2HqhToVM';
            }
            validations.required(object);
            return object.toString();
        },
        compare(a, b) {
            // sort ascending
            return 1 * strCmp(a.toString(), b.toString());
        },
    },
    // TODO: see if needed
    // address: {
    //     _to_address(object) {
    //         validations.required(object);
    //         if (object.addy) {
    //             return object;
    //         }
    //         return Address.fromString(object);
    //     },
    //     fromByteBuffer(b) {
    //         return new Address(FastParser.ripemd160(b));
    //     },
    //     appendByteBuffer(b, object) {
    //         FastParser.ripemd160(b, Types.address._to_address(object).toBuffer());
    //         return;
    //     },
    //     fromObject(object) {
    //         return Types.address._to_address(object);
    //     },
    //     toObject(object, debug: any = {}) {
    //         if (debug.use_default && object === undefined) {
    //             return DEFAULT_ADDRESS_PREFIX + '664KmHxSuQyDsfwo4WEJvWpzg1QKdg67S';
    //         }
    //         return Types.address._to_address(object).toString();
    //     },
    //     compare(a, b) {
    //         // sort decending
    //         return -1 * strCmp(a.toString(), b.toString());
    //     },
    // },
};

const strCmp = (a, b) => (a > b ? 1 : a < b ? -1 : 0);
const firstEl = (el) => (Array.isArray(el) ? el[0] : el);
const sortOperation = (array, st_operation) => {
    // console.log('operation.nosort', st_operation.nosort)
    return st_operation.nosort
        ? array
        : st_operation.compare
        ? array.sort((a, b) => st_operation.compare(firstEl(a), firstEl(b))) // custom compare operation
        : array.sort((a, b) =>
              typeof firstEl(a) === 'number' && typeof firstEl(b) === 'number'
                  ? firstEl(a) - firstEl(b)
                  : // A binary string compare does not work. Performanance is very good so HEX is used..  localeCompare is another option.
                  Buffer.isBuffer(firstEl(a)) && Buffer.isBuffer(firstEl(b))
                  ? strCmp(firstEl(a).toString('hex'), firstEl(b).toString('hex'))
                  : strCmp(firstEl(a).toString(), firstEl(b).toString()),
          );
};
