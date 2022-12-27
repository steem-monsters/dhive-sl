import { ClientFetch } from '../../clientFetch';
import { HiveEngineContract } from './base';
import { HiveEngineNftMarketTableName } from '../types';

export class HiveEngineNftMarketContractsApi extends HiveEngineContract<HiveEngineNftMarketTableName> {
    constructor(fetch: ClientFetch) {
        super(fetch, 'nftmarket');
    }

    public getParams(): Promise<any> {
        return this.findOne('params', {});
    }
}
