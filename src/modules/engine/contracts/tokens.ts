import { HiveEngineAssetSymbol } from '../../../chain/engine';
import { HiveEngineContractsApi, HiveEngineContractsOptions } from '../contracts';

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

export class HiveEngineTokensContractsApi {
    private id = 'tokens';

    constructor(private readonly contracts: HiveEngineContractsApi) {}

    public getContract() {
        return this.contracts.getContract(this.id);
    }

    public getAccountBalance(account: string, symbol: HiveEngineAssetSymbol) {
        return this.contracts.findOne<HiveEngineTokenBalance>(this.id, 'balances', { account, symbol });
    }

    public getAccountBalances(account: string, symbols: HiveEngineAssetSymbol[] = [], options?: HiveEngineContractsOptions) {
        return this.contracts.find<HiveEngineTokenBalance[]>(this.id, 'balances', symbols.length > 0 ? { account, symbol: { $in: symbols } } : { account }, options);
    }

    public getBalances(query: any = {}, options?: HiveEngineContractsOptions): Promise<HiveEngineTokenBalance[]> {
        return this.contracts.find<HiveEngineTokenBalance[]>(this.id, 'balances', query, options);
    }

    public getTokens(options?: HiveEngineContractsOptions) {
        return this.contracts.find(this.id, 'tokens', {}, options);
    }

    public getToken(symbol: HiveEngineAssetSymbol, options?: HiveEngineContractsOptions) {
        return this.contracts.find(this.id, 'tokens', { symbol }, options);
    }
}
