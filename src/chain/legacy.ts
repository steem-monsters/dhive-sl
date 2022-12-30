// Originally from hive-js - https://gitlab.syncad.com/hive/hive-js

import Long from 'long';
import { ByteBuffer } from '../crypto/bytebuffer';
import { DEFAULT_ADDRESS_PREFIX } from '../utils/constants';
import { PublicKey } from './keys';
import { binaryStringToBytes, bytesToBinaryString } from '../crypto/utils';

const HEX_DUMP = process.env.npm_config__graphene_serializer_hex_dump;

export class LegacySerializer {
    private operationName: string;
    private types: any;
    private keys: any;
    private addressPrefix: string;
    static printDebug: boolean;

    constructor(operationName, types, addressPrefix = DEFAULT_ADDRESS_PREFIX) {
        this.operationName = operationName;
        this.types = types;
        this.addressPrefix = addressPrefix;
        if (this.types) this.keys = Object.keys(this.types);
    }

    fromByteBuffer(b: ByteBuffer) {
        const object = {};
        const field = null;
        try {
            const iterable = this.keys;
            for (let i = 0, field; i < iterable.length; i++) {
                field = iterable[i];
                const type = this.types[field];
                try {
                    if (HEX_DUMP) {
                        if (type.operationName) {
                            console.error(type.operationName);
                        } else {
                            const o1 = b.offset;
                            type.fromByteBuffer(b);
                            const o2 = b.offset;
                            b.offset = o1;
                            //b.reset()
                            const _b = b.copy(o1, o2);
                            console.error(`${this.operationName}.${field}\t`, _b.toHex());
                        }
                    }
                    object[field] = type.fromByteBuffer(b);
                } catch (e) {
                    console.error(`Error reading ${this.operationName}.${field} in data:`, b);
                    throw e;
                }
            }
        } catch (error) {
            ErrorWithCause.throw(this.operationName + '.' + field, error);
        }

        return object;
    }

    appendByteBuffer(b: ByteBuffer, object) {
        const field: any = null;
        try {
            const iterable = this.keys;
            for (let i = 0, field; i < iterable.length; i++) {
                field = iterable[i];
                const type = this.types[field];
                type.appendByteBuffer(b, object[field], this.addressPrefix);
            }
        } catch (error) {
            try {
                ErrorWithCause.throw(this.operationName + '.' + field + ' = ' + JSON.stringify(object[field]), error);
            } catch (e) {
                // circular ref
                ErrorWithCause.throw(this.operationName + '.' + field + ' = ' + object[field], error);
            }
        }
        return;
    }

    fromObject(serialized_object) {
        const result = {};
        const field = null;
        try {
            const iterable = this.keys;
            for (let i = 0, field; i < iterable.length; i++) {
                field = iterable[i];
                const type = this.types[field];
                const value = serialized_object[field];
                const object = type.fromObject(value);
                result[field] = object;
            }
        } catch (error) {
            ErrorWithCause.throw(this.operationName + '.' + field, error);
        }

        return result;
    }

    /**
        @arg {boolean} [debug.use_default = false] - more template friendly
        @arg {boolean} [debug.annotate = false] - add user-friendly information
    */
    toObject(serialized_object = {}, debug = { use_default: false, annotate: false }) {
        const result = {};
        const field = null;
        try {
            if (!this.types) return result;

            const iterable = this.keys;
            for (let i = 0, field; i < iterable.length; i++) {
                field = iterable[i];
                const type = this.types[field];
                const object = type.toObject(
                    typeof serialized_object !== 'undefined' && serialized_object !== null ? serialized_object[field] : undefined,
                    debug,
                    this.addressPrefix,
                );
                result[field] = object;
                if (HEX_DUMP) {
                    let b = new ByteBuffer();
                    const has_value = typeof serialized_object !== 'undefined' && serialized_object !== null;
                    if (has_value) {
                        const value = serialized_object[field];
                        if (value) type.appendByteBuffer(b, value);
                    }
                    b = b.copy(0, b.offset);
                    console.error(this.operationName + '.' + field, b.toHex());
                }
            }
        } catch (error) {
            ErrorWithCause.throw(this.operationName + '.' + field, error);
        }

        return result;
    }

    fromBuffer(buffer) {
        return this.fromByteBuffer(ByteBuffer.fromBinary(bytesToBinaryString(buffer)));
    }

    toByteBuffer(object) {
        const b = new ByteBuffer();
        this.appendByteBuffer(b, object);
        return b.copy(0, b.offset);
    }

    toBuffer(object) {
        return binaryStringToBytes(this.toByteBuffer(object).toBinary());
    }
}

class ErrorWithCause {
    public message: string;
    public stack: any;

    constructor(message, cause) {
        this.message = message;
        if (typeof cause !== 'undefined' && cause !== null ? cause.message : undefined) {
            this.message = `cause\t${cause.message}\t` + this.message;
        }

        let stack = ''; //(new Error).stack
        if (typeof cause !== 'undefined' && cause !== null ? cause.stack : undefined) {
            stack = `caused by\n\t${cause.stack}\t` + stack;
        }

        this.stack = this.message + '\n' + stack;
    }

    static throw(message, cause) {
        let msg = message;
        if (typeof cause !== 'undefined' && cause !== null ? cause.message : undefined) {
            msg += `\t cause: ${cause.message} `;
        }
        if (typeof cause !== 'undefined' && cause !== null ? cause.stack : undefined) {
            msg += `\n stack: ${cause.stack} `;
        }
        throw new Error(msg);
    }
}

const parsePublicKey = (b: ByteBuffer, publicKey?: PublicKey) => {
    if (!b) return;

    if (publicKey) {
        b.append(PublicKey.from(publicKey).toBinaryString(), 'binary');
        return;
    } else {
        const b_copy = b.copy(b.offset, b.offset + 33);
        b.skip(33);

        return PublicKey.from(binaryStringToBytes(b_copy.toString('binary')));
    }
};

export const Types = {
    uint32: {
        fromByteBuffer: (b: ByteBuffer) => b.readUInt32(),
        appendByteBuffer(b: ByteBuffer, object) {
            validations.require_range(0, 0xffffffff, object, `uint32 ${object}`);
            return b.writeUInt32(object);
        },
        fromObject(object) {
            validations.require_range(0, 0xffffffff, object, `uint32 ${object}`);
            return object;
        },
    },
    uint64: {
        fromByteBuffer: (b: ByteBuffer) => b.readUInt64(),
        appendByteBuffer: (b: ByteBuffer, object) => b.writeUInt64(validations.to_long(validations.unsigned(object))),
        fromObject: (object) => validations.to_long(validations.unsigned(object)),
    },
    stringBinary: {
        fromByteBuffer(b: ByteBuffer) {
            const len = b.readVarint32() as number;
            const b_copy = b.copy(b.offset, b.offset + len);
            b.skip(len);
            return b_copy.toString('binary');
        },
        appendByteBuffer(b: ByteBuffer, object) {
            b.writeVarint32(object.length);
            return b.append(object.toString('binary'), 'binary');
        },
        fromObject(object) {
            validations.required(object);
            return bytesToBinaryString(object);
        },
    },
    publicKey: {
        toPublic: (object: any) => PublicKey.from(object),
        fromByteBuffer: (b: ByteBuffer) => parsePublicKey(b),
        appendByteBuffer: (b: ByteBuffer, object: any) => {
            validations.required(object);
            return parsePublicKey(b, Types.publicKey.toPublic(object));
        },
        fromObject(object) {
            validations.required(object);
            if (object.Q) return object;
            return Types.publicKey.toPublic(object);
        },
    },
};

export const EncryptedMemoSerializer = new LegacySerializer('encryptedMemo', {
    from: Types.publicKey,
    to: Types.publicKey,
    nonce: Types.uint64,
    check: Types.uint32,
    encrypted: Types.stringBinary,
}) as any;

let is_empty;
let to_number;

const MAX_SAFE_INT = 9007199254740991;
const MIN_SAFE_INT = -9007199254740991;

const validations = {
    is_empty: (is_empty = function (value) {
        return value === null || value === undefined;
    }),
    required(value, field_name = '') {
        if (is_empty(value)) throw new Error(`value required ${field_name} ${value}`);
        return value;
    },

    require_long(value, field_name = '') {
        if (!Long.isLong(value)) throw new Error(`ByteBuffer.Long value required ${field_name} ${value}`);
        return value;
    },
    unsigned(value, field_name = '') {
        if (is_empty(value)) return value;
        if (/-/.test(value)) throw new Error(`unsigned required ${field_name} ${value}`);
        return value;
    },

    to_number: (to_number = function (value, field_name = '') {
        if (is_empty(value)) return value;
        validations.no_overflow53(value, field_name);
        const int_value = (() => {
            if (typeof value === 'number') return value;
            else return parseInt(value);
        })();
        return int_value;
    }),

    to_long(value, field_name = '') {
        if (is_empty(value)) return value;
        if (Long.isLong(value)) return value;
        validations.no_overflow64(value, field_name);
        if (typeof value === 'number') value = '' + value;
        return Long.fromString(value);
    },

    to_string(value, field_name = '') {
        if (is_empty(value)) return value;
        if (typeof value === 'string') return value;
        if (typeof value === 'number') {
            validations.no_overflow53(value, field_name);
            return '' + value;
        }
        if (Long.isLong(value)) return value.toString();
        throw `unsupported type ${field_name}: (${typeof value}) ${value}`;
    },

    // Does not support over 53 bits
    require_range(min, max, value, field_name = '') {
        if (is_empty(value)) return value;
        const number = to_number(value);
        if (number < min || number > max) throw new Error(`out of range ${value} ${field_name} ${value}`);
        return value;
    },

    // signed / unsigned decimal
    no_overflow53(value, field_name = '') {
        if (typeof value === 'number') {
            if (value > MAX_SAFE_INT || value < MIN_SAFE_INT) throw new Error(`overflow ${field_name} ${value}`);
        } else if (typeof value === 'string') {
            const int = parseInt(value);
            if (int > MAX_SAFE_INT || int < MIN_SAFE_INT) throw new Error(`overflow ${field_name} ${value}`);
        } else if (Long.isLong(value)) {
            validations.no_overflow53(value.toInt(), field_name);
        } else throw `unsupported type ${field_name}: (${typeof value}) ${value}`;
    },
    // signed / unsigned whole numbers only
    no_overflow64(value, field_name = '') {
        // https://github.com/dcodeIO/ByteBuffer.Long.js/issues/20
        if (Long.isLong(value)) return;

        // BigInteger#isBigInteger https://github.com/cryptocoinjs/bigi/issues/20
        if (value.t !== undefined && value.s !== undefined) return validations.no_overflow64(value.toString(), field_name);

        if (typeof value === 'string') {
            // remove leading zeros, will cause a false positive
            value = value.replace(/^0+/, '');
            // remove trailing zeros
            while (/0$/.test(value)) {
                value = value.substring(0, value.length - 1);
            }
            if (/\.$/.test(value)) {
                // remove trailing dot
                value = value.substring(0, value.length - 1);
            }
            if (value === '') {
                value = '0';
            }
            const long_string = Long.fromString(value).toString();
            if (long_string !== value.trim()) throw new Error(`overflow ${field_name} ${value}`);
            return;
        }
        throw `unsupported type ${field_name}: (${typeof value}) ${value}`;
    },
};
