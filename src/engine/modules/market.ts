import { ClientFetch } from '../../clientFetch';
import { HiveEngineContract, HiveEngineContractsOptions } from './base';
import { HiveEngineMarketTableName } from '../types';

export interface MarketMetric {
    _id: number;
    symbol: string;
    volume: string; // Floating Point Number in string form
    volumeExpiration: number; // UNIX Timestamp (Epoch in Seconds)
    lastPrice: string; // Floating Point Number in string form
    lowestAsk: string; // Floating Point Number in string form
    highestBid: string; // Floating Point Number in string form
    lastDayPrice: string; // Floating Point Number in string form
    lastDayPriceExpiration: number; // UNIX Timestamp (Epoch in Seconds)
    priceChangeHive: string; // Floating Point Number in string form
    priceChangePercent: string; // Floating Point Number in string form
}

export class HiveEngineMarketContractsApi extends HiveEngineContract<HiveEngineMarketTableName> {
    constructor(fetch: ClientFetch) {
        super(fetch, 'market');
    }

    public getMetrics(symbol: string | string[], options?: HiveEngineContractsOptions): Promise<MarketMetric[]> {
        return this.find('metrics', { symbol: { $in: Array.isArray(symbol) ? symbol : [symbol] } }, options);
    }
}
