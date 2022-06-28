/* eslint-disable @typescript-eslint/no-unused-vars */
// Originally from hive-js - https://gitlab.syncad.com/hive/hive-js

let is_empty;
let is_digits;
let to_number;
let require_match;
let require_object_id;
let require_object_type;
let get_instance;
let require_relative_type;
let get_relative_instance;
let require_protocol_type;
let get_protocol_instance;
let get_protocol_type;
let require_implementation_type;
let get_implementation_instance;
import { Long } from 'bytebuffer';

import { ChainTypes } from './chaintypes';

const MAX_SAFE_INT = 9007199254740991;
const MIN_SAFE_INT = -9007199254740991;

/**
    Most validations are skipped and the value returned unchanged when an empty string, null, or undefined is encountered (except "required"). 

    Validations support a string format for dealing with large numbers.
*/
const validations = {
    is_empty: (is_empty = function (value) {
        return value === null || value === undefined;
    }),

    required(value, field_name = '') {
        if (is_empty(value)) {
            throw new Error(`value required ${field_name} ${value}`);
        }
        return value;
    },

    require_long(value, field_name = '') {
        if (!Long.isLong(value)) {
            throw new Error(`Long value required ${field_name} ${value}`);
        }
        return value;
    },

    string(value) {
        if (is_empty(value)) {
            return value;
        }
        if (typeof value !== 'string') {
            throw new Error(`string required: ${value}`);
        }
        return value;
    },

    number(value) {
        if (is_empty(value)) {
            return value;
        }
        if (typeof value !== 'number') {
            throw new Error(`number required: ${value}`);
        }
        return value;
    },

    whole_number(value, field_name = '') {
        if (is_empty(value)) {
            return value;
        }
        if (/\./.test(value)) {
            throw new Error(`whole number required ${field_name} ${value}`);
        }
        return value;
    },

    unsigned(value, field_name = '') {
        if (is_empty(value)) {
            return value;
        }
        if (/-/.test(value)) {
            throw new Error(`unsigned required ${field_name} ${value}`);
        }
        return value;
    },

    is_digits: (is_digits = function (value) {
        if (typeof value === 'number') {
            return true;
        }
        return /^[0-9]+$/.test(value);
    }),

    to_number: (to_number = function (value, field_name = '') {
        if (is_empty(value)) {
            return value;
        }
        validations.no_overflow53(value, field_name);
        const int_value = (() => {
            if (typeof value === 'number') {
                return value;
            } else {
                return parseInt(value);
            }
        })();
        return int_value;
    }),

    to_long(value, field_name = '') {
        if (is_empty(value)) {
            return value;
        }
        if (Long.isLong(value)) {
            return value;
        }

        validations.no_overflow64(value, field_name);
        if (typeof value === 'number') {
            value = '' + value;
        }
        return Long.fromString(value);
    },

    to_string(value, field_name = '') {
        if (is_empty(value)) {
            return value;
        }
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'number') {
            validations.no_overflow53(value, field_name);
            return '' + value;
        }
        if (Long.isLong(value)) {
            return value.toString();
        }
        throw `unsupported type ${field_name}: (${typeof value}) ${value}`;
    },

    require_test(regex, value, field_name = '') {
        if (is_empty(value)) {
            return value;
        }
        if (!regex.test(value)) {
            throw new Error(`unmatched ${regex} ${field_name} ${value}`);
        }
        return value;
    },

    require_match: (require_match = function (regex, value, field_name = '') {
        if (is_empty(value)) {
            return value;
        }
        const match = value.match(regex);
        if (match === null) {
            throw new Error(`unmatched ${regex} ${field_name} ${value}`);
        }
        return match;
    }),

    // require_object_id: require_object_id=function(value, field_name){
    //     return require_match(
    //         /^([0-9]+)\.([0-9]+)\.([0-9]+)$/,
    //         value,
    //         field_name
    //     );
    // },

    // Does not support over 53 bits
    require_range(min, max, value, field_name = '') {
        if (is_empty(value)) {
            return value;
        }
        const number = to_number(value);
        if (value < min || value > max) {
            throw new Error(`out of range ${value} ${field_name} ${value}`);
        }
        return value;
    },

    require_object_type: (require_object_type = function (reserved_spaces = 1, type, value, field_name = '') {
        if (is_empty(value)) {
            return value;
        }
        const object_type = ChainTypes.object_type[type];
        if (!object_type) {
            throw new Error(`Unknown object type: ${type}, ${field_name}, ${value}`);
        }
        const re = new RegExp(`${reserved_spaces}\.${object_type}\.[0-9]+$`);
        if (!re.test(value)) {
            throw new Error(`Expecting ${type} in format ` + `${reserved_spaces}.${object_type}.[0-9]+ ` + `instead of ${value} ${field_name} ${value}`);
        }
        return value;
    }),

    get_instance: (get_instance = function (reserve_spaces, type, value, field_name?: any) {
        if (is_empty(value)) {
            return value;
        }
        require_object_type(reserve_spaces, type, value, field_name);
        return to_number(value.split('.')[2]);
    }),

    require_relative_type: (require_relative_type = function (type, value, field_name?: any) {
        require_object_type(0, type, value, field_name);
        return value;
    }),

    get_relative_instance: (get_relative_instance = function (type, value, field_name?: any) {
        if (is_empty(value)) {
            return value;
        }
        require_object_type(0, type, value, field_name);
        return to_number(value.split('.')[2]);
    }),

    require_protocol_type: (require_protocol_type = function (type, value, field_name?: any) {
        require_object_type(1, type, value, field_name);
        return value;
    }),

    get_protocol_instance: (get_protocol_instance = function (type, value, field_name?: any) {
        if (is_empty(value)) {
            return value;
        }
        require_object_type(1, type, value, field_name);
        return to_number(value.split('.')[2]);
    }),

    get_protocol_type: (get_protocol_type = function (value, field_name?: any) {
        if (is_empty(value)) {
            return value;
        }
        require_object_id(value, field_name);
        const values = value.split('.');
        return to_number(values[1]);
    }),

    get_protocol_type_name(value, field_name?: any) {
        if (is_empty(value)) {
            return value;
        }
        const type_id = get_protocol_type(value, field_name);
        return Object.keys(ChainTypes.object_type)[type_id];
    },

    require_implementation_type: (require_implementation_type = function (type, value, field_name?: any) {
        require_object_type(2, type, value, field_name);
        return value;
    }),

    get_implementation_instance: (get_implementation_instance = function (type, value, field_name?: any) {
        if (is_empty(value)) {
            return value;
        }
        require_object_type(2, type, value, field_name);
        return to_number(value.split('.')[2]);
    }),

    // signed / unsigned decimal
    no_overflow53(value, field_name = '') {
        if (typeof value === 'number') {
            if (value > MAX_SAFE_INT || value < MIN_SAFE_INT) {
                throw new Error(`overflow ${field_name} ${value}`);
            }
            return;
        }
        if (typeof value === 'string') {
            const int = parseInt(value);
            if (int > MAX_SAFE_INT || int < MIN_SAFE_INT) {
                throw new Error(`overflow ${field_name} ${value}`);
            }
            return;
        }
        if (Long.isLong(value)) {
            // typeof value.toInt() is 'number'
            validations.no_overflow53(value.toInt(), field_name);
            return;
        }
        throw `unsupported type ${field_name}: (${typeof value}) ${value}`;
    },

    // signed / unsigned whole numbers only
    no_overflow64(value, field_name = '') {
        // https://github.com/dcodeIO/Long.js/issues/20
        if (Long.isLong(value)) {
            return;
        }

        // BigInteger#isBigInteger https://github.com/cryptocoinjs/bigi/issues/20
        if (value.t !== undefined && value.s !== undefined) {
            validations.no_overflow64(value.toString(), field_name);
            return;
        }

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
            if (long_string !== value.trim()) {
                throw new Error(`overflow ${field_name} ${value}`);
            }
            return;
        }
        if (typeof value === 'number') {
            if (value > MAX_SAFE_INT || value < MIN_SAFE_INT) {
                throw new Error(`overflow ${field_name} ${value}`);
            }
            return;
        }

        throw `unsupported type ${field_name}: (${typeof value}) ${value}`;
    },
};

export default validations;
