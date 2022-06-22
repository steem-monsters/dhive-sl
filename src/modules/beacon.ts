/**
 * @file Peakd Beacon helper
 * @author Wolf
 */

import fetch from 'cross-fetch';
import { log, prependHttp } from '../utils';

interface BeaconNodeBase {
    name: string;
    endpoint: string;
    updated_at: string; // iso
    score: number; // between 0 and 100
}

export interface BeaconNode extends BeaconNodeBase {
    success: number; // how many calls succeeded
    fail: number; // how many calls failed
}

export interface BeaconNodeFull extends BeaconNodeBase {
    website_only: boolean;
    tests: BeaconTest[];
}

interface BeaconTest {
    name: string;
    description: string;
    type: BeaconTestType;
    method: string;
    success: boolean;
}

type BeaconTestType = 'fetch' | 'cast';

export type BeaconMode = 'manual' | 'interval';

export interface BeaconParameters {
    /**
     * Beacon url to be used
     * Default: https://beacon.peakd.com/api
     */
    url?: string;
    /**
     * Whether nodes should update with interval or only manually by calling loadNodes()
     */
    mode?: BeaconMode;

    /**
     * Whether nodes should be loaded as soon as Client is initialized via new Client()
     */
    loadOnInitialize?: boolean;
    /**
     * Interval time for update in seconds
     * Default: 300
     */
    intervalTime?: number;
    /**
     * Minimum score to be used (0-100)
     * Default: 80
     */
    minimumScore?: number;
}

export class BeaconAPI {
    public mode: BeaconMode;
    public lastUpdate: Date;
    public intervalTime: number;
    public loadOnInitialize: boolean;
    private url: string;
    private minimumScore: number;

    constructor(options: BeaconParameters = {}) {
        this.url = options.url || 'https://beacon.peakd.com/api';

        this.intervalTime = options.intervalTime || 300;
        this.minimumScore = options.minimumScore || 80;
        this.mode = options.mode || 'interval';
        this.loadOnInitialize = options.loadOnInitialize || false;
    }

    /**
     * Convenience for calling `account_by_key_api`.
     */
    private async call(method: string, params?: any) {
        const result = await fetch(`${this.url}/${method}${params || ''}`);
        return result.ok ? result.json() : null;
    }

    /**
     * Returns all accounts that have the key associated with their owner or active authorities.
     */
    private async best(): Promise<BeaconNode[]> {
        return this.call('best');
    }

    /**
     * Returns all accounts that have the key associated with their owner or active authorities.
     */
    private async node(name: string): Promise<BeaconNodeFull> {
        return this.call('nodes', `/${name}`);
    }

    public convertToBeaconNodes(urls: string[] | BeaconNode[]): BeaconNode[] {
        return urls.map((url: string | BeaconNode) => {
            return typeof url === 'string' ? { endpoint: prependHttp(url), name: url, fail: 0, score: 0, success: 0, updated_at: '' } : url;
        });
    }

    /**
     * Don't call this directly. Use client.loadNodes() instead
     */
    public async loadNodes(isInterval = false) {
        let nodes: BeaconNode[] = [];
        if (!this.lastUpdate || !isInterval || this.lastUpdate.getTime() < Date.now() - this.intervalTime * 1000 * 0.5) {
            const newNodes = await this.best();
            this.lastUpdate = new Date();
            if (newNodes && newNodes.length > 0) {
                const validNodes = newNodes.filter((node) => node.score >= this.minimumScore);
                if (validNodes && validNodes.length > 0) {
                    nodes = newNodes;
                }
            }
            if (nodes.length <= 0) {
                log('Warning: no valid beacon nodes found');
            } else {
                log(`Got ${nodes.length} beacon nodes`);
            }
        }

        return nodes;
    }
}
