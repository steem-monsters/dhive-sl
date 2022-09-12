import assert from 'assert';
import { BeaconAPI, BeaconNode } from './modules/beacon';
import { copy, isTxError, log, prependHttp, timeout } from './utils';
import { VError } from 'verror';
import fetch from 'cross-fetch';

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

interface RpcNode extends Partial<BeaconNode> {
    type: 'hive' | 'hiveengine';
    name: string;
    endpoint: string;
    disabled: boolean;
    lastError: number;
    errors: number;
}

export class ClientFetch {
    /**
     * Toggle - true if nodes are set
     */
    public isInitialized: boolean;

    /**
     * Timeout for RPC fetch
     */
    private timeout: number;

    /**
     *  How often RPC nodes can throw errors before they're disabled
     */
    private nodeErrorLimit: number;

    /**
     * Current node of nodes
     */
    private currentNode: RpcNode;

    /**
     * Beacon nodes via loadNodes()
     */
    private beaconNodes: RpcNode[];

    /**
     * Interal nodes variable
     */
    private _nodes: RpcNode[];

    /**
     * Interval for loadNodes()
     */
    private beaconInterval: any;

    private agent?: any;

    constructor(private fetchType: 'hive' | 'hiveengine', private beacon: BeaconAPI, nodes?: string | string[], timeout = 1000, nodeErrorLimit = 10, agent?: any) {
        this.timeout = timeout;
        this.nodeErrorLimit = nodeErrorLimit;
        this.agent = agent;
        this._nodes = [];
        if (nodes) {
            nodes = !Array.isArray(nodes) ? [nodes] : nodes;
            this._nodes = nodes.map((node) => {
                return { name: prependHttp(node, { blank: true }), endpoint: prependHttp(node), disabled: false, errors: 0, lastError: 0, type: fetchType };
            });
            this.currentNode = this._nodes[0];
            this.isInitialized = true;
        }
        this.beaconNodes = [];
    }

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

    public async clearInterval() {
        clearInterval(this.beaconInterval);
    }

    public async loadNodes() {
        // hiveengine is not yet supported for beacon
        if (this.fetchType === 'hive') {
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
                            this.beaconNodes.push({ ...newBNode, disabled: false, errors: 0, lastError: 0, type: this.fetchType });
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
        if (this.nodes.filter((node) => !node.disabled).length > 0) this.isInitialized = true;
    }

    /**
     * Make a RPC call to the server.
     *
     * @param api     The API to call, e.g. `database_api`.
     * @param method  The API method, e.g. `get_dynamic_global_properties`.
     * @param params  Array of parameters to pass to the method, optional.
     *
     */
    public async call(method: string, params: any = []): Promise<any> {
        /**
         * Nodes aren't set yet
         */
        if (!this.isInitialized && this.fetchType === 'hive') {
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

        assert(this.nodes.filter((node) => !node.disabled).length > 0, 'nodes is empty. Either set nodes manually or run client.loadNodes()');

        const request: RPCCall =
            this.fetchType === 'hive'
                ? {
                      id: 0,
                      jsonrpc: '2.0',
                      method,
                      params,
                  }
                : { jsonrpc: '2.0', id: 0, ...params };

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

        if (this.agent) {
            opts.agent = this.agent;
        }

        // Only for non-broadcast: return fast or abort
        if (this.fetchType === 'hive') {
            if (!method.includes('network_broadcast_api') && !method.includes('broadcast_transaction')) {
                opts.timeout = this.timeout;
            }
        } else if (this.fetchType === 'hiveengine') {
            if (method === 'getContract' || method === 'find' || method === 'findOne') {
                opts.timeout = this.timeout;
            }
        }

        const { response }: { response: RPCResponse } = await this.retryingFetch(opts, method, params);

        if (this.fetchType === 'hive') assert.equal(response.id, request.id, 'got invalid response id');
        return response.result;
    }

    /**
     * Fetch API wrapper that retries until timeout is reached.
     */
    public async retryingFetch(opts: any, method: string, params: any) {
        do {
            for (let i = 0; i < this.nodes.length; i++) {
                const hasError = this.nodes[i].lastError > Date.now() - 60 * 60 * 1000;
                if (!this.nodes[i].disabled || !hasError) {
                    this.nodes[i].disabled = false;
                    this.currentNode = this.nodes[i];

                    try {
                        const response = await fetch(this.fetchType === 'hiveengine' ? `${this.currentNode.endpoint}/${method}` : this.currentNode.endpoint, opts);
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
                            `Error making RPC call to node [${this.currentNode.endpoint}], Method Name: [${method}], Params: [${JSON.stringify(params)}], Error: ${error}`,
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
}
