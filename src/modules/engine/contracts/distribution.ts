// TODO
import { HiveEngineContractsApi } from '../contracts';

export class HiveEngineDistributionContractsApi {
    private id = 'distribution';

    constructor(private readonly contracts: HiveEngineContractsApi) {}

    public getContract() {
        return this.contracts.getContract(this.id);
    }

    public getParams(): Promise<any> {
        return this.contracts.findOne(this.id, 'params', {});
    }
}
