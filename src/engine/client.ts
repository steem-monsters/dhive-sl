import { BroadcastAPI } from '../modules/broadcast';
import { ClientFetch } from '../clientFetch';
import { HiveEngineBlockchainApi, HiveEngineBlockchainOptions } from './modules/blockchain';
import {
    HiveEngineDistributionContractsApi,
    HiveEngineMarketContractsApi,
    HiveEngineMarketPoolsContractsApi,
    HiveEngineNftContractsApi,
    HiveEngineNftMarketContractsApi,
    HiveEngineWitnessesContractsApi,
} from './modules';
import { HiveEngineOperation, HiveEngineOperationJson, HiveEngineTokensTransferOperation } from './types';
import { HiveEngineTokensContractsApi } from './modules/tokens';
import { PrivateKey } from '../chain/keys';

export interface HiveEngineOptions {
    nodes: string | string[];
    chainId: string;
}

export type HiveEngineParameters = Partial<HiveEngineOptions> & Partial<HiveEngineBlockchainOptions>;

export class HiveEngineClient {
    public static defaultNodes = ['https://api.hive-engine.com/rpc', 'https://herpc.dtools.dev', 'https://enginerpc.com'];
    public static defaultChainId = 'ssc-mainnet-hive';
    // Modules
    public readonly blockchain: HiveEngineBlockchainApi;

    // Contracts
    public readonly distribution: HiveEngineDistributionContractsApi;
    public readonly market: HiveEngineMarketContractsApi;
    public readonly marketpools: HiveEngineMarketPoolsContractsApi;
    public readonly nft: HiveEngineNftContractsApi;
    public readonly nftmarket: HiveEngineNftMarketContractsApi;
    public readonly tokens: HiveEngineTokensContractsApi;
    public readonly witnesses: HiveEngineWitnessesContractsApi;

    private options: HiveEngineOptions;

    constructor(private readonly fetch: ClientFetch, private readonly broadcastApi: BroadcastAPI, parameters: HiveEngineParameters = {}) {
        this.options = {
            nodes: HiveEngineClient.defaultNodes,
            chainId: HiveEngineClient.defaultChainId,
            ...parameters,
        };

        // Modules
        this.blockchain = new HiveEngineBlockchainApi(this.fetch, parameters);

        // Contracts
        this.distribution = new HiveEngineDistributionContractsApi(this.fetch);
        this.market = new HiveEngineMarketContractsApi(this.fetch);
        this.marketpools = new HiveEngineMarketPoolsContractsApi(this.fetch);
        this.nft = new HiveEngineNftContractsApi(this.fetch);
        this.nftmarket = new HiveEngineNftMarketContractsApi(this.fetch);
        this.tokens = new HiveEngineTokensContractsApi(this.fetch);
        this.witnesses = new HiveEngineWitnessesContractsApi(this.fetch);

        this.distribution = new HiveEngineDistributionContractsApi(this.fetch);
    }

    public async broadcast(op: HiveEngineOperation, account: string, privateKey: string | PrivateKey | string[] | PrivateKey[], role: 'active' | 'posting' = 'posting') {
        const json: HiveEngineOperationJson = { contractName: op[0], contractAction: op[1], contractPayload: op[2] };
        return this.broadcastApi.customJsonQueue({ id: this.options.chainId, account, role, json }, privateKey);
    }

    public async transfer(data: HiveEngineTokensTransferOperation[2], from: string, privateKey: string | PrivateKey | string[] | PrivateKey[]) {
        const op: HiveEngineTokensTransferOperation = ['tokens', 'transfer', data];
        return this.broadcast(op as HiveEngineOperation, from, privateKey);
    }
}
