import { ClientFetch } from '../../clientFetch';
import { HiveEngineAssetSymbol, HiveEngineTokensTableName } from '../types';
import { HiveEngineContract, HiveEngineContractsOptions } from './base';

export interface HiveEngineTokenBalance {
    _id: number;
    account: string;
    symbol: string;
    balance: string;
    stake: string;
    pendingUnstake: string;
    delegationsIn: string;
    delegationsOut: string;
    pendingUndelegations: string;
}

export interface HiveEngineTokenDelegation {
    _id: number;
    from: string;
    to: string;
    symbol: string;
    quantity: string;
}

export interface HiveEnginePendingUnstakes {
    _id: number;
    account: string;
    symbol: string;
    quantity: string;
    quantityLeft: string;
    nextTransactionTimestamp: string;
    numberTransactionsLeft: string;
    txID: string;
}

export interface HiveEnginePendingUndelegations {
    account: string;
    symbol: string;
    quantity: string;
    completeTimestamp: string;
    txID: string;
}

export interface HiveEngineToken {
    _id: number;
    issuer: string;
    symbol: string;
    name: string;
    metadata: string;
    precision: number;
    maxSupply: string;
    supply: string;
    circulatingSupply: string;
    stakingEnabled: true;
    unstakingCooldown: number;
    delegationEnabled: true;
    undelegationCooldown: number;
    numberTransactions: number;
    totalStaked: string;
}

export class HiveEngineTokensContractsApi extends HiveEngineContract<HiveEngineTokensTableName> {
    constructor(fetch: ClientFetch) {
        super(fetch, 'tokens');
    }

    public getAccountBalance(account: string, symbol: HiveEngineAssetSymbol) {
        return this.findOne<HiveEngineTokenBalance>('balances', { account, symbol });
    }

    public getAccountBalances(account: string, symbols: HiveEngineAssetSymbol[] = [], options?: HiveEngineContractsOptions) {
        return this.find<HiveEngineTokenBalance[]>('balances', symbols.length > 0 ? { account, symbol: { $in: symbols } } : { account }, options);
    }

    public getBalances(query: any = {}, options?: HiveEngineContractsOptions): Promise<HiveEngineTokenBalance[]> {
        return this.find<HiveEngineTokenBalance[]>('balances', query, options);
    }

    public getToken(symbol: string, options?: HiveEngineContractsOptions) {
        return this.find<HiveEngineToken>('tokens', { symbol }, options);
    }

    public getTokens(symbols: string[] = [], options?: HiveEngineContractsOptions) {
        return this.find<HiveEngineToken[]>('tokens', symbols.length > 0 ? { symbol: { $in: symbols } } : {}, options);
    }
}
