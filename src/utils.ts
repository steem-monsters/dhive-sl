import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

/**
 * Return a promise that will resove when a specific event is emitted.
 */
export function waitForEvent<T>(emitter: EventEmitter, eventName: string | symbol): Promise<T> {
    return new Promise((resolve) => {
        emitter.once(eventName, resolve);
    });
}

/**
 * Sleep for N milliseconds.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Return a stream that emits iterator values.
 */
export function iteratorStream<T>(iterator: AsyncIterableIterator<T>): NodeJS.ReadableStream {
    const stream = new PassThrough({ objectMode: true });
    const iterate = async () => {
        for await (const item of iterator) {
            if (!stream.write(item)) {
                await waitForEvent(stream, 'drain');
            }
        }
    };
    iterate()
        .then(() => {
            stream.end();
        })
        .catch((error) => {
            stream.emit('error', error);
            stream.end();
        });
    return stream;
}

/**
 * Return a deep copy of a JSON-serializable object.
 */
export function copy<T>(object: T): T {
    return JSON.parse(JSON.stringify(object));
}

// Hack to be able to generate a valid witness_set_properties op
// Can hopefully be removed when hived's JSON representation is fixed
import * as ByteBuffer from 'bytebuffer';
import { Asset, PriceType } from './chain/asset';
import { WitnessSetPropertiesOperation } from './chain/operation';
import { Serializer, Types } from './chain/serializer';
import { PublicKey } from './chain/keys';
export interface WitnessProps {
    account_creation_fee?: string | Asset;
    account_subsidy_budget?: number; // uint32_t
    account_subsidy_decay?: number; // uint32_t
    key: PublicKey | string;
    maximum_block_size?: number; // uint32_t
    new_signing_key?: PublicKey | string | null;
    hbd_exchange_rate?: PriceType;
    hbd_interest_rate?: number; // uint16_t
    url?: string;
}
function serialize(serializer: Serializer, data: any) {
    const buffer = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
    serializer(buffer, data);
    buffer.flip();
    // `props` values must be hex
    return buffer.toString('hex');
    // return Buffer.from(buffer.toBuffer());
}
export function buildWitnessUpdateOp(owner: string, props: WitnessProps): WitnessSetPropertiesOperation {
    const data: WitnessSetPropertiesOperation[1] = {
        extensions: [],
        owner,
        props: [],
    };
    for (const key of Object.keys(props)) {
        let type: Serializer;
        switch (key) {
            case 'key':
            case 'new_signing_key':
                type = Types.PublicKey;
                break;
            case 'account_subsidy_budget':
            case 'account_subsidy_decay':
            case 'maximum_block_size':
                type = Types.UInt32;
                break;
            case 'hbd_interest_rate':
                type = Types.UInt16;
                break;
            case 'url':
                type = Types.String;
                break;
            case 'hbd_exchange_rate':
                type = Types.Price;
                break;
            case 'account_creation_fee':
                type = Types.Asset;
                break;
            default:
                throw new Error(`Unknown witness prop: ${key}`);
        }
        data.props.push([key, serialize(type, props[key])]);
    }
    data.props.sort((a, b) => a[0].localeCompare(b[0]));
    return ['witness_set_properties', data];
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const JSBI = require('jsbi');
export const operationOrders = {
    vote: 0,
    // tslint:disable-next-line: object-literal-sort-keys
    comment: 1,
    transfer: 2,
    transfer_to_vesting: 3,
    withdraw_vesting: 4,
    limit_order_create: 5,
    limit_order_cancel: 6,
    feed_publish: 7,
    convert: 8,
    account_create: 9,
    account_update: 10,
    witness_update: 11,
    account_witness_vote: 12,
    account_witness_proxy: 13,
    pow: 14,
    custom: 15,
    report_over_production: 16,
    delete_comment: 17,
    custom_json: 18,
    comment_options: 19,
    set_withdraw_vesting_route: 20,
    limit_order_create2: 21,
    claim_account: 22,
    create_claimed_account: 23,
    request_account_recovery: 24,
    recover_account: 25,
    change_recovery_account: 26,
    escrow_transfer: 27,
    escrow_dispute: 28,
    escrow_release: 29,
    pow2: 30,
    escrow_approve: 31,
    transfer_to_savings: 32,
    transfer_from_savings: 33,
    cancel_transfer_from_savings: 34,
    custom_binary: 35,
    decline_voting_rights: 36,
    reset_account: 37,
    set_reset_account: 38,
    claim_reward_balance: 39,
    delegate_vesting_shares: 40,
    account_create_with_delegation: 41,
    witness_set_properties: 42,
    account_update2: 43,
    create_proposal: 44,
    update_proposal_votes: 45,
    remove_proposal: 46,
    update_proposal: 47,
    collateralized_convert: 48,
    recurrent_transfer: 49,
    // virtual ops
    fill_convert_request: 50,
    author_reward: 51,
    curation_reward: 52,
    comment_reward: 53,
    liquidity_reward: 54,
    interest: 55,
    fill_vesting_withdraw: 56,
    fill_order: 57,
    shutdown_witness: 58,
    fill_transfer_from_savings: 59,
    hardfork: 60,
    comment_payout_update: 61,
    return_vesting_delegation: 62,
    comment_benefactor_reward: 63,
    producer_reward: 64,
    clear_null_account_balance: 65,
    proposal_pay: 66,
    sps_fund: 67,
    hardfork_hive: 68,
    hardfork_hive_restore: 69,
    delayed_voting: 70,
    consolidate_treasury_balance: 71,
    effective_comment_vote: 72,
    ineffective_delete_comment: 73,
    sps_convert: 74,
    expired_account_notification: 75,
    changed_recovery_account: 76,
    transfer_to_vesting_completed: 77,
    pow_reward: 78,
    vesting_shares_split: 79,
    account_created: 80,
    fill_collateralized_convert_request: 81,
    system_warning: 82,
    fill_recurrent_transfer: 83,
    failed_recurrent_transfer: 84,
};

/**
 * Make bitmask filter to be used with getAccountHistory call
 * @param allowedOperations Array of operations index numbers
 */
export function makeBitMaskFilter(allowedOperations: number[]) {
    return allowedOperations.reduce(redFunction as any, [JSBI.BigInt(0), JSBI.BigInt(0)]).map((value) => (JSBI.notEqual(value, JSBI.BigInt(0)) ? value.toString() : null));
}

const redFunction = ([low, high], allowedOperation) => {
    if (allowedOperation < 64) {
        return [JSBI.bitwiseOr(low, JSBI.leftShift(JSBI.BigInt(1), JSBI.BigInt(allowedOperation))), high];
    } else {
        return [low, JSBI.bitwiseOr(high, JSBI.leftShift(JSBI.BigInt(1), JSBI.BigInt(allowedOperation - 64)))];
    }
};

// SL

// let _options = { logging_level: 3 };

// export const setOptions = (options) => {
//   _options = Object.assign(_options, options);
// };

export const enum LogLevel {
    Error = 1,
    Warning = 2,
    Info = 3,
    Debug = 4,
}

type LogColors = keyof typeof logColors;

// Logging levels: 1 = Error, 2 = Warning, 3 = Info, 4 = Debug
export function log(msg: string, level: LogLevel = 0, color: LogColors | null = null) {
    if (color && logColors[color]) msg = logColors[color] + msg + logColors.Reset;

    if (level <= (process.env.LOGGING_LEVEL || 5)) console.log(`${new Date().toLocaleString()} - ${msg}`);
}

const logColors = {
    Reset: '\x1b[0m',
    Bright: '\x1b[1m',
    Dim: '\x1b[2m',
    Underscore: '\x1b[4m',
    Blink: '\x1b[5m',
    Reverse: '\x1b[7m',
    Hidden: '\x1b[8m',

    Black: '\x1b[30m',
    Red: '\x1b[31m',
    Green: '\x1b[32m',
    Yellow: '\x1b[33m',
    Blue: '\x1b[34m',
    Magenta: '\x1b[35m',
    Cyan: '\x1b[36m',
    White: '\x1b[37m',

    BgBlack: '\x1b[40m',
    BgRed: '\x1b[41m',
    BgGreen: '\x1b[42m',
    BgYellow: '\x1b[43m',
    BgBlue: '\x1b[44m',
    BgMagenta: '\x1b[45m',
    BgCyan: '\x1b[46m',
    BgWhite: '\x1b[47m',
};

export const timeout = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const tryParse = (json) => {
    try {
        return JSON.parse(json);
    } catch (err) {
        log('Error trying to parse JSON: ' + json, 3, 'Red');
        return null;
    }
};

export const isTxError = (err) => {
    return err && err.name == 'RPCError' && err.jse_info && err.jse_info.code != 4030200 && ([10, 13].includes(err.jse_info.code) || err.jse_info.code > 1000000);
};

// https://github.com/sindresorhus/prepend-http/blob/main/index.js
export const prependHttp = (url: string, { https = true, blank = false } = {}) => {
    if (typeof url !== 'string') {
        throw new TypeError(`Expected \`url\` to be of type \`string\`, got \`${typeof url}\``);
    }

    url = url.trim();

    if (/^\.*\/|^(?!localhost)\w+?:/.test(url)) {
        return url;
    }

    const replacedUrl = url.replace(/^(?!(?:\w+?:)?\/\/)/, https ? 'https://' : 'http://');
    return blank ? url.replace('https://', '') : replacedUrl;
};

export const uniqueArray = <T>(a: any[], key?: string): T[] => {
    if (key) {
        return [...new Set(a.map((r) => r[key]))].map((r) => a.filter((r2) => r2[key] === r)[0]);
    }

    return [...new Set(a.map((o) => JSON.stringify(o)))].map((s) => JSON.parse(s as any));
};

export const validateAccountName = (value: string) => {
    const fn = () => {
        let suffix = 'Account name should ';
        if (!value) {
            return suffix + 'not be empty.';
        }
        const length = value.length;
        if (length < 3) {
            return suffix + 'be longer.';
        }
        if (length > 16) {
            return suffix + 'be shorter.';
        }
        if (/\./.test(value)) {
            suffix = 'Each account segment should ';
        }
        const ref = value.split('.');
        for (let i = 0, len = ref.length; i < len; i++) {
            const label = ref[i];
            if (!/^[a-z]/.test(label)) {
                return suffix + 'start with a letter.';
            }
            if (!/^[a-z0-9-]*$/.test(label)) {
                return suffix + 'have only letters, digits, or dashes.';
            }
            if (/--/.test(label)) {
                return suffix + 'have only one dash in a row.';
            }
            if (!/[a-z0-9]$/.test(label)) {
                return suffix + 'end with a letter or digit.';
            }
            if (!(label.length >= 3)) {
                return suffix + 'be longer';
            }
        }
        return null;
    };
    const reason = fn();
    return reason ? { status: 'error', message: reason } : { status: 'success' };
};
