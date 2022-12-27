export interface SMTAsset {
    amount: string | number;
    precision: number;
    nai: string;
}

/**
 * Asset symbol string.
 */
export type AssetSymbol = 'HIVE' | 'VESTS' | 'HBD' | AssetSymbolLegacy | AssetSymbolTestnet;
export type AssetSymbolTestnet = 'TESTS' | 'TBD';
export type AssetSymbolLegacy = 'STEEM' | 'SBD';
export type AssetSymbolRC = 'RC' | 'RCS';

export const RCS_PER_RC = 1000000000;

/**
 * Class representing a hive asset, e.g. `1.000 HIVE` or `12.112233 VESTS`.
 */
export class Asset {
    constructor(public readonly amount: number, public readonly symbol: AssetSymbol) {}

    /**
     * Create a new Asset instance from a string, e.g. `42.000 HIVE`.
     */
    public static fromString(string: string, expectedSymbol?: AssetSymbol) {
        const [amountString, symbol] = string.split(' ');
        if (!['HIVE', 'VESTS', 'HBD', 'TESTS', 'TBD', 'SBD', 'STEEM'].includes(symbol)) {
            throw new Error(`Invalid asset symbol: ${symbol}`);
        }
        if (expectedSymbol && symbol !== expectedSymbol) {
            throw new Error(`Invalid asset, expected symbol: ${expectedSymbol} got: ${symbol}`);
        }
        const amount = Number.parseFloat(amountString);
        if (!Number.isFinite(amount)) {
            throw new Error(`Invalid asset amount: ${amountString}`);
        }
        return new Asset(amount, symbol as AssetSymbol);
    }

    /**
     * Convenience to create new Asset.
     * @param symbol Symbol to use when created from number. Will also be used to validate
     *               the asset, throws if the passed value has a different symbol than this.
     */
    public static from(value: string | Asset | number, symbol?: AssetSymbol) {
        if (value instanceof Asset) {
            if (symbol && value.symbol !== symbol) {
                throw new Error(`Invalid asset, expected symbol: ${symbol} got: ${value.symbol}`);
            }
            return value;
        } else if (typeof value === 'number' && !Number.isNaN(Number(value)) && Number.isFinite(Number(value))) {
            return new Asset(Number(value), symbol || 'HIVE');
        } else if (typeof value === 'string') {
            return Asset.fromString(value, symbol);
        } else {
            throw new Error(`Invalid asset '${String(value)}'`);
        }
    }

    /**
     * Return the smaller of the two assets.
     */
    public static min(a: Asset, b: Asset) {
        if (a.symbol !== b.symbol) throw Error('can not compare assets with different symbols');
        return a.amount < b.amount ? a : b;
    }

    /**
     * Return the larger of the two assets.
     */
    public static max(a: Asset, b: Asset) {
        if (a.symbol !== b.symbol) throw Error('can not compare assets with different symbols');
        return a.amount > b.amount ? a : b;
    }

    /**
     * Return asset precision.
     */
    public getPrecision(): number {
        switch (this.symbol) {
            case 'TESTS':
            case 'TBD':
            case 'HIVE':
            case 'HBD':
            case 'SBD':
            case 'STEEM':
                return 3;
            case 'VESTS':
                return 6;
        }
    }

    /**
     * returns a representation of this asset using only STEEM SBD for
     * legacy purposes
     */
    public steem_symbols(): Asset {
        switch (this.symbol) {
            case 'HIVE':
                return Asset.from(this.amount, 'STEEM');
            case 'HBD':
                return Asset.from(this.amount, 'SBD');
            default:
                return this;
        }
    }

    /**
     * Return a string representation of this asset, e.g. `42.000 HIVE`.
     */
    public toString(): string {
        return `${this.amount.toFixed(this.getPrecision())} ${this.symbol}`;
    }

    /**
     * Return a new Asset instance with amount added.
     */
    public add(amount: Asset | string | number): Asset {
        const other = Asset.from(amount, this.symbol);
        if (this.symbol !== other.symbol) throw Error('can not add with different symbols');
        return new Asset(this.amount + other.amount, this.symbol);
    }

    /**
     * Return a new Asset instance with amount subtracted.
     */
    public subtract(amount: Asset | string | number): Asset {
        const other = Asset.from(amount, this.symbol);
        if (this.symbol !== other.symbol) throw Error('can not subtract with different symbols');
        return new Asset(this.amount - other.amount, this.symbol);
    }

    /**
     * Return a new Asset with the amount multiplied by factor.
     */
    public multiply(factor: Asset | string | number): Asset {
        const other = Asset.from(factor, this.symbol);
        if (this.symbol !== other.symbol) throw Error('can not multiply with different symbols');
        return new Asset(this.amount * other.amount, this.symbol);
    }

    /**
     * Return a new Asset with the amount divided.
     */
    public divide(divisor: Asset | string | number): Asset {
        const other = Asset.from(divisor, this.symbol);
        if (this.symbol !== other.symbol) throw Error('can not divide with different symbols');
        return new Asset(this.amount / other.amount, this.symbol);
    }
}

export class RCAsset {
    constructor(public readonly amount: number, public readonly symbol: AssetSymbolRC) {}

    /**
     * Create a new Asset instance from a string, e.g. `5 RC`.
     */
    public static fromString(string: string, expectedSymbol?: AssetSymbolRC): RCAsset {
        const [amountString, symbol] = string.split(' ');
        if (!['RC', 'RCS'].includes(symbol)) {
            throw new Error(`Invalid asset symbol: ${symbol}`);
        }
        if (expectedSymbol && symbol !== expectedSymbol) {
            throw new Error(`Invalid asset, expected symbol: ${expectedSymbol} got: ${symbol}`);
        }
        const amount = Number.parseFloat(amountString);
        if (!Number.isFinite(amount)) {
            throw new Error(`Invalid asset amount: ${amountString}`);
        }
        return new RCAsset(amount, symbol as AssetSymbolRC);
    }

    /**
     * Convenience to create new Asset.
     * @param symbol Symbol to use when created from number. Will also be used to validate
     *               the asset, throws if the passed value has a different symbol than this.
     */
    public static from(value: string | Asset | number, symbol?: AssetSymbolRC): RCAsset {
        if (value instanceof RCAsset) {
            if (symbol && value.symbol !== symbol) {
                throw new Error(`Invalid asset, expected symbol: ${symbol} got: ${value.symbol}`);
            }
            return value;
        } else if (!Number.isNaN(Number(value)) && Number.isFinite(Number(value))) {
            return new RCAsset(Number(value), symbol || 'RC');
        } else if (typeof value === 'string') {
            return RCAsset.fromString(value, symbol);
        } else {
            throw new Error(`Invalid asset '${String(value)}'`);
        }
    }

    /**
     * Return asset precision.
     */
    public getPrecision(): number {
        switch (this.symbol) {
            case 'RC':
                return 9;
            case 'RCS':
                0;
        }
        return 0;
    }
    /**
     * Returns amount of RCS
     * RC => Resource Credits
     * RCS => Resource Credits Satoshis
     *
     * 1  RC = 1,000,000,000 RCS
     * 15 RC = 15 * 1,000,000,000 RCS
     */
    public toSatoshi() {
        if (this.symbol === 'RCS') return this;
        return RCAsset.from(parseFloat((this.amount * RCS_PER_RC).toFixed(0)), 'RCS');
    }

    /**
     * Returns amount of RC
     * RC => Resource Credits
     * RCS => Resource Credits Satoshis
     *
     * 1  RC = 1,000,000,000 RCS
     * 15 RC = 15 * 1,000,000,000 RCS
     */
    public fromSatoshi() {
        if (this.symbol === 'RC') return this;
        return RCAsset.from(parseFloat((this.amount / RCS_PER_RC).toFixed(9)), 'RC');
    }
}

export type PriceType = Price | { base: Asset | string; quote: Asset | string };

/**
 * Represents quotation of the relative value of asset against another asset.
 * Similar to 'currency pair' used to determine value of currencies.
 *
 *  For example:
 *  1 EUR / 1.25 USD where:
 *  1 EUR is an asset specified as a base
 *  1.25 USD us an asset specified as a qute
 *
 *  can determine value of EUR against USD.
 */
export class Price {
    /**
     * @param base  - represents a value of the price object to be expressed relatively to quote
     *                asset. Cannot have amount == 0 if you want to build valid price.
     * @param quote - represents an relative asset. Cannot have amount == 0, otherwise
     *                asertion fail.
     *
     * Both base and quote shall have different symbol defined.
     */
    constructor(public readonly base: Asset, public readonly quote: Asset) {
        if (base.amount === 0 || quote.amount === 0) throw Error('base and quote assets must be non-zero');
        if (base.symbol === quote.symbol) throw Error('base and quote can not have the same symbol');
    }

    /**
     * Convenience to create new Price.
     */
    public static from(value: PriceType) {
        if (value instanceof Price) {
            return value;
        } else {
            return new Price(Asset.from(value.base), Asset.from(value.quote));
        }
    }

    /**
     * Return a string representation of this price pair.
     */
    public toString() {
        return `${this.base}:${this.quote}`;
    }

    /**
     * Return a new Asset with the price converted between the symbols in the pair.
     * Throws if passed asset symbol is not base or quote.
     */
    public convert(asset: Asset) {
        if (asset.symbol === this.base.symbol) {
            if (this.base.amount <= 0) throw Error();
            return new Asset((asset.amount * this.quote.amount) / this.base.amount, this.quote.symbol);
        } else if (asset.symbol === this.quote.symbol) {
            if (this.quote.amount <= 0) throw Error();
            return new Asset((asset.amount * this.base.amount) / this.quote.amount, this.base.symbol);
        } else {
            throw new Error(`Can not convert ${asset} with ${this}`);
        }
    }
}
