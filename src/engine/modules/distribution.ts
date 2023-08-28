// TODO
import { ClientFetch } from '../../clientFetch';
import { HiveEngineContract } from './base';
import { HiveEngineDistributionTableName } from '../types';

export class HiveEngineDistributionContractsApi extends HiveEngineContract<HiveEngineDistributionTableName> {
    constructor(fetch: ClientFetch) {
        super(fetch, 'distribution');
    }

    public getParams(): Promise<any> {
        return this.findOne('params', {});
    }
}
