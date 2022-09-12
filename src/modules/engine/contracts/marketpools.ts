import { HiveEngineContractsApi, HiveEngineContractsOptions } from '../contracts';

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

export class HiveEngineMarketPoolsContractsApi {
    private id = 'marketpools';

    constructor(private readonly contracts: HiveEngineContractsApi) {}

    public getContract() {
        return this.contracts.getContract(this.id);
    }

    public getParams() {
        return this.contracts.findOne<HiveEngineMarketPoolsParams>(this.id, 'params', {});
    }

    public getLiquidityPositions(account: string, options?: HiveEngineContractsOptions) {
        return this.contracts.find<HiveEngineLiquidityPosition[]>(this.id, 'liquidityPositions', { account }, options);
    }

    public getPools(tokenPair: MarketPoolPair | MarketPoolPair[]) {
        return this.contracts.find<HiveEngineMarketPool[]>(this.id, 'pools', { tokenPair: { $in: Array.isArray(tokenPair) ? tokenPair : [tokenPair] } });
    }
}
