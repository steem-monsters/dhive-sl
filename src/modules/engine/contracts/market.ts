// TODO
import { HiveEngineContractsApi, HiveEngineContractsOptions } from '../contracts';

export class HiveEngineMarketContractsApi {
    private id = 'market';

    constructor(private readonly contracts: HiveEngineContractsApi) {}

    public getContract() {
        return this.contracts.getContract(this.id);
    }

    public getMetrics(account: string, options?: HiveEngineContractsOptions) {
        return this.contracts.find(this.id, 'metrics', { account }, options);
    }
}
