import { ClientFetch } from '../../clientFetch';
import { HiveEngineContract, HiveEngineContractsOptions } from './base';
import { HiveEngineMarketPoolsTableName } from '../types';

export type MarketPoolPair = 'SWAP.HIVE:VOUCHER' | string;

export interface HiveEngineLiquidityPosition {
    _id: number;
    account: string;
    tokenPair: string;
    shares: string;
    timeFactor: number;
}

export interface HiveEngineMarketPoolsParams {
    _id: number;
    poolCreationFee: string;
    tradeFeeMul: string;
    updateIndex: number;
}

export interface HiveEngineMarketPool {
    _id: number;
    tokenPair: string;
    baseQuantity: string;
    baseVolume: string;
    basePrice: string;
    quoteQuantity: string;
    quoteVolume: string;
    quotePrice: string;
    totalShares: string;
    precision: number;
    creator: string;
}

export class HiveEngineMarketPoolsContractsApi extends HiveEngineContract<HiveEngineMarketPoolsTableName> {
    constructor(fetch: ClientFetch) {
        super(fetch, 'marketpools');
    }

    public getParams() {
        return this.findOne<HiveEngineMarketPoolsParams>('params', {});
    }

    public getLiquidityPositions(account: string, options?: HiveEngineContractsOptions) {
        return this.find<HiveEngineLiquidityPosition[]>('liquidityPositions', { account }, options);
    }

    public getPools(tokenPair: MarketPoolPair | MarketPoolPair[]) {
        return this.find<HiveEngineMarketPool[]>('pools', { tokenPair: { $in: Array.isArray(tokenPair) ? tokenPair : [tokenPair] } });
    }
}
