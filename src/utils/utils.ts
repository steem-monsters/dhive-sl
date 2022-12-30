export const timeout = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const copy = <T>(object: T): T => {
    return JSON.parse(JSON.stringify(object));
};

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

export const tryParse = (json) => {
    try {
        return JSON.parse(json);
    } catch (err) {
        log('Error trying to parse JSON: ' + json, LogLevel.Info, 'Red');
        return null;
    }
};

export const isTxError = (err) => {
    return err && err.name == 'RPCError' && err.jse_info && err.jse_info.code != 4030200 && ([10, 13].includes(err.jse_info.code) || err.jse_info.code > 1000000);
};

// https://github.com/sindresorhus/prepend-http/blob/main/index.js
export const prependHttp = (url: string, { https = true, blank = false } = {}) => {
    if (typeof url !== 'string') throw new TypeError(`Expected \`url\` to be of type \`string\`, got \`${typeof url}\``);

    url = url.trim();

    if (/^\.*\/|^(?!localhost)\w+?:/.test(url)) return url;

    const replacedUrl = url.replace(/^(?!(?:\w+?:)?\/\/)/, https ? 'https://' : 'http://');
    return blank ? url.replace('https://', '') : replacedUrl;
};

export type TimerType = ReturnType<typeof setTimeout>;

export type WrappedPseudoInterval = {
    readonly interval?: TimerType;
};

/**
 * Create a WrappedPseudoInterval that guarantees at least `ms` milliseconds between the end of one `callback` invocation and the beginning of another.
 * @param callback - function that will be repeatedly called with `args`.
 * @param ms - interval delay in milliseconds.
 * @param args - positional rest arguments for the callback.
 */
export function setSingleEntryInterval<TArgs extends any[]>(callback: (...args: TArgs) => void, ms?: number, ...args: TArgs): WrappedPseudoInterval {
    let interval: TimerType | undefined;
    const retval: WrappedPseudoInterval = {
        get interval() {
            return interval;
        },
    };
    const setter = (v: TimerType) => (interval = v);
    (function loop() {
        setter(
            setTimeout(() => {
                callback(...args);
                loop();
            }, ms),
        );
    })();
    return retval;
}

export const sortAsc = (arr: any[], key?: string) => [...arr].sort((a, b) => (key ? a[key] - b[key] : a - b));
export const sortDesc = (arr: any[], key?: string) => [...arr].sort((a, b) => (key ? b[key] - a[key] : b - a));

export const generateUniqueNounce = (length = 8, rng?: any) => {
    if (!rng) rng = Math.random;

    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let retVal = '';
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(rng() * n));
    }
    return retVal;
};

export const isArrayEqual = (first: any[] | Uint8Array, second: any[] | Uint8Array) => first.length === second.length && first.every((value, index) => value === second[index]);
