import { ClientFetch } from '../clientFetch';
import { PublicKey } from '../chain/keys';

export class AccountByKeyAPI {
    constructor(private readonly fetch: ClientFetch) {}

    /**
     * Convenience for calling `account_by_key_api` api.
     */
    public call(method: string, params?: any) {
        return this.fetch.call(`account_by_key_api.${method}`, params);
    }

    /**
     * Returns all accounts that have the key associated with their owner or active authorities.
     */
    public async getKeyReferences(keys: (PublicKey | string)[]): Promise<string[]> {
        const result = await this.call('get_key_references', { keys: keys.map((key) => key.toString()) });
        return result?.accounts?.[0]?.length > 0 ? result.accounts[0] : [];
    }
}
