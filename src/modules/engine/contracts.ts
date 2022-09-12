import { HiveEngineRequest } from '../../chain/engine';
import { HiveEngineClient } from './engine';

export interface HiveEngineContract {
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

export interface HiveEngineContractsOptions {
    limit?: number;
    offset?: number;
    indexes?: { index: string; descending: boolean }[];
}

export class HiveEngineContractsApi {
    constructor(private readonly client: HiveEngineClient) {}

    public call<T = any>(request: HiveEngineRequest, callback: any = null) {
        return this.client.send<T>('contracts', request, callback);
    }

    /**
     * Get the information of a contract (owner, source code, etc...)
     * @param name contract name
     * @param callback callback called if passed
     */
    public getContract(name: string, callback: any = null) {
        const request: HiveEngineRequest = {
            method: 'getContract',
            params: {
                name,
            },
        };

        return this.call<HiveEngineContract>(request, callback);
    }

    /**
     * retrieve a record from the table of a contract
     * @param contract contract name
     * @param table table name
     * @param query query to perform on the table
     * @param callback callback called if passed
     */
    public findOne<T = any>(contract: string, table: string, query: any, callback: any = null) {
        const request: HiveEngineRequest = {
            method: 'findOne',
            params: {
                contract,
                table,
                query,
            },
        };

        return this.call<T>(request, callback);
    }

    /**
     * retrieve records from the table of a contract
     * @param contract contract name
     * @param table table name
     * @param query query to perform on the table
     * @param opations options
     */
    public find<T = any>(contract: string, table: string, query: any, options: HiveEngineContractsOptions = { limit: 1000, offset: 0, indexes: [] }, callback = null) {
        const request: HiveEngineRequest = {
            method: 'find',
            params: {
                contract,
                table,
                query,
                ...options,
            },
        };

        return this.call<T>(request, callback);
    }
}
