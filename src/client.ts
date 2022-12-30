import {
    AccountByKeyAPI,
    BeaconAPI,
    BeaconParameters,
    Blockchain,
    BlockchainMode,
    BroadcastAPI,
    DatabaseAPI,
    HivemindAPI,
    OperationAPI,
    RCAPI,
    SLBlockchainStreamParameters,
    TransactionStatusAPI,
} from './modules';
import { ClientFetch } from './clientFetch';
import { DEFAULT_ADDRESS_PREFIX, DEFAULT_CHAIN_ID } from './utils/constants';
import { HiveEngineClient, HiveEngineParameters } from './engine/client';
import { LogLevel } from './utils/utils';
import { Memo } from './chain/memo';
import { TransactionQueue } from './utils/transactionQueue';
import { UsageTrackerParameters } from './utils/usageTracker';
import { hexToBytes } from '@noble/hashes/utils';

/**
 * RPC Client
 */
export class Client {
    public readonly options: ClientOptions;
    public readonly database: DatabaseAPI;
    public readonly rc: RCAPI;
    public readonly broadcast: BroadcastAPI;
    public readonly operation: OperationAPI;
    public readonly blockchain: Blockchain;
    public readonly hivemind: HivemindAPI;
    public readonly engine: HiveEngineClient;
    public readonly keys: AccountByKeyAPI;
    public readonly transaction: TransactionStatusAPI;
    public readonly beacon: BeaconAPI;
    public readonly memo: Memo;

    public readonly chainId: Uint8Array;
    public readonly addressPrefix: string;
    public readonly blockchainMode: BlockchainMode;
    public readonly transactionQueue: TransactionQueue;
    public readonly fetch: { hive: ClientFetch; engine: ClientFetch };

    /**
     * @param options Client options.
     */
    constructor(options: ClientOptions = {}) {
        this.options = options;
        this.chainId = options.chainId ? hexToBytes(options.chainId) : DEFAULT_CHAIN_ID;
        if (this.chainId.length !== 32) throw Error('invalid chain id');
        this.addressPrefix = options.addressPrefix || DEFAULT_ADDRESS_PREFIX;
        this.blockchainMode = options.blockchainMode || 'latest';

        this.transactionQueue = new TransactionQueue(options.usageLimits, options.skipTransactionQueue);

        this.beacon = new BeaconAPI(options.beacon, options.fetchMethod);
        this.fetch = {
            hive: new ClientFetch('hive', this.beacon, options.nodes, options.timeout, options.nodeErrorLimit, options.agent, options.fetchMethod),
            engine: new ClientFetch('hiveengine', this.beacon, options.engine?.nodes || HiveEngineClient.defaultNodes, options.timeout, options.nodeErrorLimit),
        };

        this.database = new DatabaseAPI(this.fetch.hive);
        this.operation = new OperationAPI(this.database, this.addressPrefix, options.uniqueNounceKey);
        this.broadcast = new BroadcastAPI(this.fetch.hive, this.operation, this.database, this.transactionQueue, this.chainId);

        this.blockchain = new Blockchain(this.fetch.hive, this.database, options.stream);
        this.rc = new RCAPI(this.fetch.hive, this.database);
        this.hivemind = new HivemindAPI(this.fetch.hive);
        this.keys = new AccountByKeyAPI(this.fetch.hive);
        this.transaction = new TransactionStatusAPI(this.fetch.hive);
        this.engine = new HiveEngineClient(this.fetch.engine, this.broadcast, options.engine);
        this.memo = new Memo(options.memoPrefix, this.addressPrefix);

        if (this.beacon.loadOnInitialize) {
            setTimeout(async () => {
                await this.loadNodes();
            }, 500);
        }
    }

    public destroy() {
        this.transactionQueue.stop();
        this.fetch.hive.clearInterval();
        this.fetch.engine.clearInterval();
    }

    public async loadNodes() {
        return Promise.all([await this.fetch.hive.loadNodes(), await this.fetch.engine.loadNodes()]);
    }

    public async call(api: string, method: string, params: any = []): Promise<any> {
        return this.fetch.hive.call(`${api}.${method}`, params);
    }

    /**
     * Create a new client instance configured for the testnet.
     */
    public static testnet(
        options: ClientOptions = {
            chainId: '4200000000000000000000000000000000000000000000000000000000000000',
            addressPrefix: 'STM',
            nodes: ['https://api.fake.openhive.network'],
        },
    ) {
        return new Client({ ...options, agent: options.agent });
    }
}

/**
 * RPC Client options
 */
export interface ClientOptions {
    nodes?: string | string[];
    /**
     * Hive chain id. Defaults to main hive network: beeab0de00000000000000000000000000000000000000000000000000000000
     */
    chainId?: string;

    /**
     * Hive address prefix. Defaults to main network: `STM`
     */
    addressPrefix?: string;

    /**
     * How long to wait in ms before giving up on a rpc call. No in-flight requests will be aborted.
     * Defaults to 1000 ms.
     */
    timeout?: number;

    /**
     * How often RPC nodes can throw errors before they're disabled
     * Default: 10
     */
    nodeErrorLimit?: number;

    /**
     * Logging level
     */
    loggingLevel?: LogLevel;

    /**
     * Whether transactions should be based on latest or irreversible blocks by default
     */
    blockchainMode?: BlockchainMode;

    /**
     * Options for block streaming methods (Splinterlands)
     */
    stream?: SLBlockchainStreamParameters;

    /**
     * Options to interact with Hive Engine
     */
    engine?: HiveEngineParameters;

    /**
     * Options to interact with the Beacon service to test & choose RPC nodes
     */
    beacon?: BeaconParameters;

    /**
     * Whether transaction queue for customJsons should be skipped (Splinterlands)
     * Default: false
     */
    skipTransactionQueue?: boolean;

    /**
     * Configure transaction queue throttling per account
     * Default: undefined (and disabled)
     */
    usageLimits?: UsageTrackerParameters;

    /**
     * Memo prefix
     * Default: #
     */
    memoPrefix?: string;

    /**
     * Key for unique nounce within custom_jsons
     * i.e. `n` for {n: 'a25BAdjf'}
     * If empty or false (default) nounce is not set
     */
    uniqueNounceKey?: string | false | null;

    /**
     * Node.js http(s) agent, use if you want http keep-alive.
     * Defaults to using https.globalAgent.
     * @see https://nodejs.org/api/http.html#http_new_agent_options.
     */
    agent?: any; // https.Agent

    /**
     * Whether native fetch method or cross-fetch should be used to broadcast
     */
    fetchMethod?: 'native' | 'cross-fetch';
}
