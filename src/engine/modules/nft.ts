import { ClientFetch } from '../../clientFetch';
import { HiveEngineContract } from './base';
import { HiveEngineNftTableName } from '../types';

export class HiveEngineNftContractsApi extends HiveEngineContract<HiveEngineNftTableName> {
    constructor(fetch: ClientFetch) {
        super(fetch, 'nft');
    }

    public getParams(): Promise<any> {
        return this.findOne('params', {});
    }
}
