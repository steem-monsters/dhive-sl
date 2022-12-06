import assert from 'assert';
import { Blockchain, BlockchainMode, SLBlockchainStreamParameters } from './modules/blockchain';
import { BroadcastAPI } from './modules/broadcast';
import { DatabaseAPI } from './modules/database';
import { HivemindAPI } from './modules/hivemind';
import { AccountByKeyAPI } from './modules/key';
import { RCAPI } from './modules/rc';
import { TransactionStatusAPI } from './modules/transaction';
import { LogLevel, log, WrappedPseudoInterval, setSingleEntryInterval } from './utils';
import { HiveEngineClient, HiveEngineParameters } from './modules/engine/engine';
import { BeaconAPI, BeaconParameters } from './modules/beacon';
import { PrivateKey } from './chain/keys/keys';
import { Memo } from './chain/memo';
import { DEFAULT_ADDRESS_PREFIX, DEFAULT_CHAIN_ID } from './constants';
import { OperationAPI } from './modules/operation';
import { ClientFetch } from './clientFetch';
import { UsageParameters, UsageTracker } from './modules/usage';

type Key = string | PrivateKey | string[] | PrivateKey[];
type TransactionCallback = (data: any, key: Key) => unknown;

interface TxInQueue {
    data: any;
    key: Key;
    txCall?: TransactionCallback;
}

/**
 * RPC Client options
 * ------------------
 */
export interface ClientOptions {
    nodes?: string | string[];
    /**
     * Hive chain id. Defaults to main hive network:
     * need the new id?
     * `beeab0de00000000000000000000000000000000000000000000000000000000`
     *
     */
    chainId?: string;

    /**
     * Hive address prefix. Defaults to main network:
     * `STM`
     */
    addressPrefix?: string;

    /**
     * Send timeout, how long to wait in milliseconds before giving
     * up on a rpc call. Note that this is not an exact timeout,
     * no in-flight requests will be aborted.
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
    usageLimits?: UsageParameters;

    /**
     * Memo prefix
     * Default: #
     */
    memoPrefix?: string;

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

/**
 * RPC Client
 * ----------
 * Can be used in both node.js and the browser. Also see {@link ClientOptions}.
 */
export class Client {
    /**
     * Client options, *read-only*.
     */
    public readonly options: ClientOptions;

    /**
     * Database API helper.
     */
    public readonly database: DatabaseAPI;

    /**
     * RC API helper.
     */
    public readonly rc: RCAPI;

    /**
     * Broadcast API helper.
     */
    public readonly broadcast: BroadcastAPI;

    /**
     * Operation helper.
     */
    public readonly operation: OperationAPI;

    /**
     * Blockchain helper.
     */
    public readonly blockchain: Blockchain;

    /**
     * Hivemind helper.
     */
    public readonly hivemind: HivemindAPI;

    /**
     * HiveEngine helper.
     */
    public readonly engine: HiveEngineClient;

    /**
     * Accounts by key API helper.
     */
    public readonly keys: AccountByKeyAPI;

    /**
     * Transaction status API helper.
     */
    public readonly transaction: TransactionStatusAPI;

    /**
     * Beacon API helper.
     */
    public readonly beacon: BeaconAPI;

    /**
     * Memo helper
     */
    public readonly memo: Memo;

    /**
     * Chain ID for current network.
     */
    public readonly chainId: Buffer;

    /**
     * Address prefix for current network.
     */
    public readonly addressPrefix: string;

    /**
     * Whether transactions should be based on latest or irreversible blocks by default
     */
    public readonly blockchainMode: BlockchainMode;

    /**
     * Transaction queue for customJsons
     */
    private transactionQueue: TxInQueue[];

    /**
     * Recursive setTimeout for transactionQueue
     */
    private transactionQueueInterval?: WrappedPseudoInterval;

    private usageTracker?: UsageTracker;

    public readonly fetch: { hive: ClientFetch; engine: ClientFetch };

    private static readonly QueueTimout = 1000;

    /**
     * @param options Client options.
     */
    constructor(options: ClientOptions = {}) {
        this.options = options;
        this.transactionQueue = [];
        this.chainId = options.chainId ? Buffer.from(options.chainId, 'hex') : DEFAULT_CHAIN_ID;
        assert.equal(this.chainId.length, 32, 'invalid chain id');
        this.addressPrefix = options.addressPrefix || DEFAULT_ADDRESS_PREFIX;
        this.blockchainMode = options.blockchainMode || 'latest';

        this.beacon = new BeaconAPI(options.beacon, options.fetchMethod);
        this.fetch = {
            hive: new ClientFetch('hive', this.beacon, options.nodes, options.timeout, options.nodeErrorLimit, options.agent, options.fetchMethod),
            engine: new ClientFetch('hiveengine', this.beacon, options.engine?.nodes || HiveEngineClient.defaultNodes, options.timeout, options.nodeErrorLimit),
        };

        this.database = new DatabaseAPI(this);
        this.broadcast = new BroadcastAPI(this);
        this.operation = new OperationAPI(this);
        this.blockchain = new Blockchain(this, options.stream);
        this.rc = new RCAPI(this);
        this.hivemind = new HivemindAPI(this);
        this.keys = new AccountByKeyAPI(this);
        this.transaction = new TransactionStatusAPI(this);
        this.engine = new HiveEngineClient(this, options.engine);
        this.memo = new Memo(options.memoPrefix, this.addressPrefix);

        if (options.usageLimits) {
            const { limit, ms } = options.usageLimits;
            this.usageTracker = new UsageTracker(limit, ms);
        }

        if (!options.skipTransactionQueue) {
            this.transactionQueueInterval = setSingleEntryInterval(() => {
                this.processTransactionQueue();
            }, Client.QueueTimout);
        }

        if (this.beacon.loadOnInitialize) {
            setTimeout(async () => {
                await this.loadNodes();
            }, 500);
        }
    }

    public destroy() {
        this.usageTracker?.stop();
        clearInterval(this.transactionQueueInterval?.interval);
        this.fetch.hive.clearInterval();
        this.fetch.engine.clearInterval();
    }

    public async loadNodes() {
        return Promise.all([await this.fetch.hive.loadNodes(), await this.fetch.engine.loadNodes()]);
    }

    /**
     * Convenience for fetch.hive.call
     */
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

    queueTransaction(data: any, key: Key, txCall?: TransactionCallback) {
        this.transactionQueue.push({ data, key, txCall });
    }

    private peekTransactionAccount() {
        const peekAccount: string | undefined = this.transactionQueue?.[0]?.data?.account;
        return peekAccount;
    }

    private processTransactionQueue() {
        while (true) {
            const peekAccount = this.peekTransactionAccount();
            if (peekAccount === undefined) return;

            if (this.usageTracker?.throttle(peekAccount)) {
                return;
            }

            const item = this.transactionQueue.shift();
            if (item) {
                log(`Processing queue item ${item.data.id}`, LogLevel.Info);
                if (item.txCall) {
                    item.txCall(item.data, item.key);
                }
            }
        }
    }
}
