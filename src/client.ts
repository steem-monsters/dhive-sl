import assert from 'assert';
import { VError } from 'verror';
import fetch from 'cross-fetch';
import { Blockchain, BlockchainMode, SLBlockchainStreamParameters } from './modules/blockchain';
import { BroadcastAPI } from './modules/broadcast';
import { DatabaseAPI } from './modules/database';
import { HivemindAPI } from './modules/hivemind';
import { AccountByKeyAPI } from './modules/key';
import { RCAPI } from './modules/rc';
import { TransactionStatusAPI } from './modules/transaction';
import { copy, LogLevel, log, isTxError, prependHttp, timeout } from './utils';
import { EngineApi, EngineParameters } from './modules/engine';
import { BeaconAPI, BeaconNode, BeaconParameters } from './modules/beacon';
import { PrivateKey } from './chain/keys/keys';
import { Memo } from './chain/memo';
import { DEFAULT_ADDRESS_PREFIX, DEFAULT_CHAIN_ID } from './constants';
import { OperationAPI } from './modules/operation';

interface RPCRequest {
    /**
     * Request sequence number.
     */
    id: number | string;
    /**
     * RPC method.
     */
    method: 'call' | 'notice' | 'callback';
    /**
     * Array of parameters to pass to the method.
     */
    jsonrpc: '2.0';
    params: any[];
}

interface RPCCall extends RPCRequest {
    method: 'call' | any;
    /**
     * 1. API to call, you can pass either the numerical id of the API you get
     *    from calling 'get_api_by_name' or the name directly as a string.
     * 2. Method to call on that API.
     * 3. Arguments to pass to the method.
     */
    params: [number | string, string, any[]];
}

interface RPCError {
    code: number;
    message: string;
    data?: any;
}

interface RPCResponse {
    /**
     * Response sequence number, corresponding to request sequence number.
     */
    id: number;
    error?: RPCError;
    result?: any;
}

// interface PendingRequest {
//     request: RPCRequest;
//     timer: NodeJS.Timer | undefined;
//     resolve: (response: any) => void;
//     reject: (error: Error) => void;
// }

interface RpcNode extends Partial<BeaconNode> {
    name: string;
    endpoint: string;
    disabled: boolean;
    lastError: number;
    errors: number;
}

interface TxInQueue {
    data: any;
    key: string | PrivateKey | string[] | PrivateKey[];
    txCall: any;
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
    engine?: EngineParameters;

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

    // /**
    //  * Address to Hive RPC server.
    //  * String or String[] *read-only*
    //  */
    // public address: string | string[];

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
    public readonly engine: EngineApi;

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
     * Timeout for RPC fetch
     */
    private timeout: number;

    /**
     *  How often RPC nodes can throw errors before they're disabled
     */
    private nodeErrorLimit: number;

    /**
     * Whether transactions should be based on latest or irreversible blocks by default
     */
    public readonly blockchainMode: BlockchainMode;

    /**
     * Current node of nodes
     */
    private currentNode: RpcNode;

    /**
     * Transaction queue for customJsons
     */
    private transactionQueue: TxInQueue[];

    /**
     * Interval for transactionQueue
     */
    private transactionQueueInterval: any;

    /**
     * Beacon nodes via loadNodes()
     */
    private beaconNodes: RpcNode[];

    /**
     * Interval for loadNodes()
     */
    private beaconInterval: any;

    /**
     * Toggle - true if nodes are set
     */
    private isInitialized: boolean;

    /**
     * Interal nodes variable
     */
    private _nodes: RpcNode[];

    /**
     * Getter for combined _nodes and beaconNodes
     */
    public get nodes() {
        const bnodes: RpcNode[] = [];
        for (let i = 0; i < this.beaconNodes.length; i++) {
            const bnode = this.beaconNodes[i];
            const nodeExists = this._nodes.filter((node) => node.endpoint === bnode.endpoint)[0];
            if (!nodeExists) bnodes.push(bnode);
        }
        const combinedNodes = this._nodes.concat(bnodes);
        if (!this.currentNode) this.currentNode = combinedNodes[0];
        return combinedNodes;
    }

    /**
     * Setter for combined _nodes and beaconNodes
     */
    public set nodes(nodes: RpcNode[]) {
        const _nodes: RpcNode[] = [];
        const bnodes: RpcNode[] = [];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            // is beacon node
            if (node.score) {
                bnodes.push(node);
            } else {
                _nodes.push(node);
            }
        }
        this.beaconNodes = bnodes;
        this._nodes = _nodes;
    }

    /**
     * @param options Client options.
     */
    constructor(options: ClientOptions = {}) {
        this.options = options;

        this._nodes = [];
        if (this.options.nodes) {
            const nodes = !Array.isArray(this.options.nodes) ? [this.options.nodes] : this.options.nodes;
            this._nodes = nodes.map((node) => {
                return { name: prependHttp(node, { blank: true }), endpoint: prependHttp(node), disabled: false, errors: 0, lastError: 0 };
            });
            this.currentNode = this._nodes[0];
            this.isInitialized = true;
        }

        this.chainId = options.chainId ? Buffer.from(options.chainId, 'hex') : DEFAULT_CHAIN_ID;
        assert.equal(this.chainId.length, 32, 'invalid chain id');
        this.addressPrefix = options.addressPrefix || DEFAULT_ADDRESS_PREFIX;

        this.timeout = options.timeout || 1000;
        this.nodeErrorLimit = options.nodeErrorLimit || 10;
        this.transactionQueue = [];
        this.blockchainMode = options.blockchainMode || 'latest';

        this.database = new DatabaseAPI(this);
        this.broadcast = new BroadcastAPI(this);
        this.operation = new OperationAPI(this);
        this.blockchain = new Blockchain(this, options.stream);
        this.rc = new RCAPI(this);
        this.hivemind = new HivemindAPI(this);
        this.keys = new AccountByKeyAPI(this);
        this.transaction = new TransactionStatusAPI(this);
        this.engine = new EngineApi(this, options.engine);
        this.beacon = new BeaconAPI(options.beacon);
        this.memo = new Memo(options.memoPrefix, this.addressPrefix);
        this.beaconNodes = [];

        if (!options.skipTransactionQueue)
            this.transactionQueueInterval = setInterval(() => {
                this.processTransactionQueue();
            }, 1000);

        if (this.beacon.loadOnInitialize) {
            setTimeout(async () => {
                await this.loadNodes();
                if (this.nodes.filter((node) => !node.disabled).length > 0) this.isInitialized = true;
            }, 500);
        }
    }

    public destroy() {
        clearInterval(this.transactionQueueInterval);
        clearInterval(this.beaconInterval);
    }

    public async loadNodes() {
        const fn = async (isInterval: boolean) => {
            const beaconNodes = await this.beacon.loadNodes(isInterval);

            if (beaconNodes.length > 0) {
                // Disable nodes that are beaconNodes but not found in current request
                for (let i = 0; i < this.beaconNodes.length; i++) {
                    const includedNode = beaconNodes.filter((node) => node.name === this.beaconNodes[i].name)[0];
                    if (!includedNode) this.beaconNodes[i].disabled = true;
                }

                for (let i = 0; i < beaconNodes.length; i++) {
                    const newBNode = beaconNodes[i];
                    const existingNode = this.beaconNodes.filter((node) => node.name === newBNode.name)[0];
                    // Beacon node does not exist yet, add to array
                    if (!existingNode) {
                        this.beaconNodes.push({ ...newBNode, disabled: false, errors: 0, lastError: 0 });
                    } else {
                        // Beacon node already exists.
                        const i2 = this.beaconNodes.indexOf(existingNode);
                        this.beaconNodes[i2].disabled = false; // Force enable again
                        this.beaconNodes[i2].endpoint = newBNode.endpoint; // Refresh endpoint
                        this.beaconNodes[i2].errors = 0; // Reset errors
                        this.beaconNodes[i2].lastError = 0; // Reset last errors
                        this.beaconNodes[i2].success = newBNode.success; // Update success
                        this.beaconNodes[i2].score = newBNode.score; // Update score
                        this.beaconNodes[i2].fail = newBNode.fail; // Update fail
                        this.beaconNodes[i2].updated_at = newBNode.updated_at; // Update updated_at
                    }
                }
            }
        };
        await fn(false);
        if (this.beacon.mode === 'interval' && !this.beaconInterval) {
            this.beaconInterval = setInterval(() => {
                fn(true);
            }, this.beacon.intervalTime * 1000);
        }
    }

    /**
     * Create a new client instance configured for the testnet.
     */
    public static testnet(options?: ClientOptions) {
        let opts: ClientOptions = {};
        if (options) {
            opts = copy(options);
            opts.agent = options.agent;
        }

        opts.addressPrefix = 'TST';
        opts.chainId = '18dcf0a285365fc58b71f18b3d3fec954aa0c141c44e4e5cb4cf777b9eab274e';
        opts.nodes = ['https://testnet.openhive.network'];
        return new Client(opts);
    }

    /**
     * Make a RPC call to the server.
     *
     * @param api     The API to call, e.g. `database_api`.
     * @param method  The API method, e.g. `get_dynamic_global_properties`.
     * @param params  Array of parameters to pass to the method, optional.
     *
     */
    public async call(api: string, method: string, params: any = []): Promise<any> {
        /**
         * Nodes aren't set yet
         */
        if (!this.isInitialized) {
            /**
             * Beacon nodes loading hasn't started yet and no nodes have been given as parameter
             */
            if (!this.beacon.loadOnInitialize && (!this.nodes || this.nodes.filter((node) => !node.disabled).length <= 0)) {
                /**
                 * Load beacon nodes
                 */
                await this.loadNodes();
            } else if (this.beacon.loadOnInitialize) {
                /**
                 * Beacon nodes loading is in progress
                 */
                for (let i = 0; i < 100; i++) {
                    // Waiting 5 seconds in 50ms steps
                    await timeout(50);
                    if (this.isInitialized) break;
                }
            }
        }

        assert(this.nodes.filter((node) => !node.disabled).length > 0, 'options.nodes is empty. Either set nodes manually or run client.loadNodes()');

        const request: RPCCall = {
            id: 0,
            jsonrpc: '2.0',
            method: `${api}.${method}`,
            params,
        };
        const body = JSON.stringify(request, (key, value) => {
            // encode Buffers as hex strings instead of an array of bytes
            if (value && typeof value === 'object' && value.type === 'Buffer') {
                return Buffer.from(value.data).toString('hex');
            }
            return value;
        });
        const opts: any = {
            body,
            cache: 'no-cache',
            headers: {
                Accept: 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
            },
            method: 'POST',
            mode: 'cors',
        };

        // Self is not defined within Node environments
        // This check is needed because the user agent cannot be set in a browser
        if (typeof self === undefined) {
            opts.headers = {
                'User-Agent': `dhive-sl`,
            };
        }

        if (this.options.agent) {
            opts.agent = this.options.agent;
        }

        // Only for non-broadcast: return fast or abort
        if (api !== 'network_broadcast_api' && !method.startsWith('broadcast_transaction')) {
            opts.timeout = this.timeout;
        }

        const { response }: { response: RPCResponse } = await this.retryingFetch(opts, api, method, params);

        assert.equal(response.id, request.id, 'got invalid response id');
        return response.result;
    }

    /**
     * Fetch API wrapper that retries until timeout is reached.
     */
    public async retryingFetch(opts: any, api: string, method: string, params: any) {
        do {
            for (let i = 0; i < this.nodes.length; i++) {
                const hasError = this.nodes[i].lastError > Date.now() - 60 * 60 * 1000;
                if (!this.nodes[i].disabled || !hasError) {
                    this.nodes[i].disabled = false;
                    this.currentNode = this.nodes[i];

                    try {
                        const response = await fetch(this.currentNode.endpoint, opts);
                        // log(`${api}.${method} request to ${this.currentNode.endpoint}`, LogLevel.Debug);
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }

                        const json = await response.json();
                        // resolve FC error messages into something more readable
                        if (json.error) {
                            const formatValue = (value: any) => {
                                switch (typeof value) {
                                    case 'object':
                                        return JSON.stringify(value);
                                    default:
                                        return String(value);
                                }
                            };
                            const { data } = json.error;
                            let { message } = json.error;
                            if (data && data.stack && data.stack.length > 0) {
                                const top = data.stack[0];
                                const topData = copy(top.data);
                                message = top.format.replace(/\$\{([a-z_]+)\}/gi, (match: string, key: string) => {
                                    let rv = match;
                                    if (topData[key]) {
                                        rv = formatValue(topData[key]);
                                        delete topData[key];
                                    }
                                    return rv;
                                });
                                const unformattedData = Object.keys(topData)
                                    .map((key) => ({ key, value: formatValue(topData[key]) }))
                                    .map((item) => `${item.key}=${item.value}`);
                                if (unformattedData.length > 0) {
                                    message += ' ' + unformattedData.join(' ');
                                }
                            }
                            throw new VError({ info: data, name: 'RPCError' }, message);
                        }

                        return { response: json };
                    } catch (error: any) {
                        error.isTxError = isTxError(error);
                        if (error.isTxError) throw error;

                        // Record that this client had an error
                        this.updateNodeErrors();
                        log(
                            `Error making RPC call to node [${this.currentNode.endpoint}], Method Name: [${api}.${method}], Params: [${JSON.stringify(params)}], Error: ${error}`,
                            2,
                            'Yellow',
                        );
                    }
                }
            }
            // Waiting 5 seconds because we're already through all given nodes
            await timeout(5 * 1000);
            // Enable all again
            for (let i = 0; i < this.nodes.length; i++) {
                this.nodes[i].disabled = false;
            }
        } while (true);
    }

    private updateNodeErrors() {
        // Check if the client has had errors within the last 10 minutes
        if (this.currentNode.lastError && this.currentNode.lastError > Date.now() - 10 * 60 * 1000) this.currentNode.errors++;
        else this.currentNode.errors = 1;

        this.currentNode.lastError = Date.now();

        if (this.currentNode.errors >= this.nodeErrorLimit) {
            log('Disabling node: ' + this.currentNode.endpoint + ' due to too many errors!', 1, 'Red');
            this.currentNode.disabled = true;
        }

        // If all clients have been disabled, we're in trouble, but just try re-enabling them all
        if (!this.nodes.find((c) => !c.disabled)) {
            log('Warning: All clients disabled! Re-enabling them.', 1, 'Red');
            this.nodes.forEach((c) => (c.disabled = false));
        }
    }

    async queueTransaction(data: any, key: string | string[] | PrivateKey | PrivateKey[], txCall: any) {
        this.transactionQueue.push({ data, key, txCall });
    }

    async processTransactionQueue() {
        if (this.transactionQueue.length <= 0) return;

        const item = this.transactionQueue.shift();
        if (item) {
            log(`Processing queue item ${item.data.id}`, LogLevel.Info);
            item.txCall(item.data, item.key);
        }
    }
}
