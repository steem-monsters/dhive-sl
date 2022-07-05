// Originally from hive-js - https://gitlab.syncad.com/hive/hive-js

import ByteBuffer from 'bytebuffer';
import { DEFAULT_ADDRESS_PREFIX } from '../../constants';
import { Types } from './types';

const HEX_DUMP = process.env.npm_config__graphene_serializer_hex_dump;

export class SerializerHiveJS {
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

        SerializerHiveJS.printDebug = true;
    }

    fromByteBuffer(b) {
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
                    if (SerializerHiveJS.printDebug) {
                        console.error(`Error reading ${this.operationName}.${field} in data:`);
                        b.printDebug();
                    }
                    throw e;
                }
            }
        } catch (error) {
            ErrorWithCause.throw(this.operationName + '.' + field, error);
        }

        return object;
    }

    appendByteBuffer(b, object) {
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
                //DEBUG value = value.resolve if value.resolve
                //DEBUG console.log('... value',field,value)
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
                    let b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
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

    /** Sort by the first element in a operation */
    compare(a, b) {
        const first_key = this.keys[0];
        const first_type = this.types[first_key];

        const valA = a[first_key];
        const valB = b[first_key];

        if (first_type.compare) return first_type.compare(valA, valB);

        if (typeof valA === 'number' && typeof valB === 'number') return valA - valB;

        let encoding;
        if (Buffer.isBuffer(valA) && Buffer.isBuffer(valB)) {
            // A binary string compare does not work.  If localeCompare is well supported that could replace HEX.  Performanance is very good so comparing HEX works.
            encoding = 'hex';
        }

        const strA = valA.toString(encoding);
        const strB = valB.toString(encoding);
        return strA > strB ? 1 : strA < strB ? -1 : 0;
    }

    // <helper_functions>

    fromHex(hex) {
        const b = ByteBuffer.fromHex(hex, ByteBuffer.LITTLE_ENDIAN);
        return this.fromByteBuffer(b);
    }

    fromBuffer(buffer): any {
        const b = ByteBuffer.fromBinary(buffer.toString('binary'), ByteBuffer.LITTLE_ENDIAN);
        return this.fromByteBuffer(b);
    }

    toHex(object) {
        // return this.toBuffer(object).toString("hex")
        const b = this.toByteBuffer(object);
        return b.toHex();
    }

    toByteBuffer(object) {
        const b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
        this.appendByteBuffer(b, object);
        return b.copy(0, b.offset);
    }

    toBuffer(object) {
        return Buffer.from(this.toByteBuffer(object).toBinary(), 'binary');
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

export const EncryptedMemoSerializer = new SerializerHiveJS('encryptedMemo', {
    from: Types.publicKey,
    to: Types.publicKey,
    nonce: Types.uint64,
    check: Types.uint32,
    encrypted: Types.stringBinary,
});
