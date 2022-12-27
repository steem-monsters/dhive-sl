import { ClientFetch } from '../../clientFetch';
import { HiveEngineContract } from './base';
import { HiveEngineWitnessesTableName } from '../types';

export class HiveEngineWitnessesContractsApi extends HiveEngineContract<HiveEngineWitnessesTableName> {
    constructor(fetch: ClientFetch) {
        super(fetch, 'witnesses');
    }
}
