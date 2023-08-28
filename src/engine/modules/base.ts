import { ClientFetch } from '../../clientFetch';
import { HiveEngineContractName, HiveEngineRequest, HiveEngineTableName } from '../types';

export type HiveEngineQueryArgs =
    | '$eq'
    // abstract/loose equality
    | '$aeq'
    | '$ne'
    // date equality / loki abstract equality test
    | '$dteq'
    | '$gt'
    | '$gte'
    | '$lt'
    | '$lte'
    /** ex : coll.find({'orderCount': {'$between: [10, 50]}})' | */
    | '$between'
    | '$jgt'
    | '$jgte'
    | '$jlt'
    | '$jlte'
    | '$jbetween'
    | '$in'
    | '$nin'
    | '$keyin'
    | '$nkeyin'
    | '$definedin'
    | '$undefinedin'
    | '$regex'
    | '$containsString'
    | '$containsNone'
    | '$containsAny'
    | '$contains'
    | '$type'
    | '$finite'
    | '$size'
    | '$len'
    | '$where'
    | '$not'
    | '$and'
    | '$or';

// { symbol: { $in: ['DEC','SPS'] } }
// { symbol: 'DEC' }
export type HiveEngineQuery<T = string> = {
    [key: string]: T | Partial<Record<HiveEngineQueryArgs, unknown>>;
};

export interface HiveEngineContractsOptions {
    limit?: number;
    offset?: number;
    indexes?: { index: string; descending: boolean }[];
}

export interface HiveEngineContractResponse {
    _id: string;
    owner: string;
    code: string;
    codeHash: string;
    tables: {
        [key: string]: {
            size: number;
            hash: string;
            nbIndexes: number;
        };
    };
    version: number;
}

export class HiveEngineContract<TableName = HiveEngineTableName> {
    constructor(private readonly fetch: ClientFetch, private readonly contractName: HiveEngineContractName) {}

    public call<T = any>(request: HiveEngineRequest) {
        return this.fetch.call<T>('contracts', request);
    }

    /**
     * Get the information of a contract (owner, source code, etc...)
     */
    public getContract() {
        const request: HiveEngineRequest = {
            method: 'getContract',
            params: {
                name: this.contractName,
            },
        };

        return this.call<HiveEngineContractResponse>(request);
    }

    /**
     * retrieve a record from the table of a contract
     * @param table table name
     * @param query query to perform on the table
     */
    public findOne<T = any>(table: TableName, query: HiveEngineQuery = {}) {
        const request: HiveEngineRequest = {
            method: 'findOne',
            params: {
                contract: this.contractName,
                table,
                query,
            },
        };

        return this.call<T>(request);
    }

    /**
     * retrieve records from the table of a contract
     * @param table table name
     * @param query query to perform on the table
     * @param opations options
     */
    public find<T = any>(table: TableName, query: HiveEngineQuery = {}, options: HiveEngineContractsOptions = { limit: 1000, offset: 0, indexes: [] }) {
        const request: HiveEngineRequest = {
            method: 'find',
            params: {
                contract: this.contractName,
                table,
                query,
                ...options,
            },
        };

        return this.call<T>(request);
    }
}
