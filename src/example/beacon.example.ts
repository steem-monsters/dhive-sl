import { Client } from '../index';
import { log, timeout } from '../utils';

const main = async () => {
    /**
     * Client 0 with no config
     * Beacon service is used to load the best RPC nodes
     * Nodes are refreshed every 300 seconds (5 Minutes) after loadNodes()
     */
    const client0 = new Client();
    log(`0 - No config client: ${(await client0.database.getAccount('splinterlands')).name}`);
    await timeout(3 * 1000);

    /**
     * Client A with pre-defined nodes
     * Beacon service is NOT used
     */
    const clientA = new Client({ nodes: ['wrong.hive-api.com', 'hived.splinterlands.com', 'hived-2.splinterlands.com'], beacon: { loadOnInitialize: false } });
    log(`A - Client: ${(await clientA.database.getAccount('splinterlands')).name}`);
    await timeout(3 * 1000);

    /**
     * Client B with pre-defined nodes
     * Beacon service is used to load the best RPC nodes
     * Nodes are refreshed every 2 seconds after loadNodes()
     */
    const clientB = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'], beacon: { intervalTime: 2, loadOnInitialize: false } });
    await clientB.loadNodes();
    log(`B - Client: ${(await clientB.database.getAccount('splinterlands')).name}`);
    await timeout(5 * 1000);
    clientB.destroy(); // Clears intervals

    /**
     * Client C with pre-defined nodes
     * Beacon service is used to load the best RPC nodes
     * Nodes are NOT refreshed due to 'manual' mode
     */
    const clientC = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'], beacon: { mode: 'manual', loadOnInitialize: false } });
    await clientC.loadNodes();
    log(`C - Client: ${(await clientC.database.getAccount('splinterlands')).name}`);
    await timeout(5 * 1000);

    /**
     * Client D with pre-defined nodes
     * Beacon service is used ON NEW CLIENT (due to loadOnInitialize) to load the best RPC nodes
     * Nodes are refreshed every 2 seconds after new Client()
     */
    const clientD = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'], beacon: { intervalTime: 2 } });
    log(`D - Client: ${(await clientD.database.getAccount('splinterlands')).name}`);
    await timeout(5 * 1000);
    clientD.destroy(); // Clears intervals

    /**
     * Client E with NO pre-defined nodes
     * Beacon service is used ON NEW CLIENT (due to loadOnInitialize) to load the best RPC nodes
     * Nodes are refreshed every 2 seconds after new Client()
     */
    const clientE = new Client({ beacon: { intervalTime: 2 } });
    log(`E - Client: ${(await clientE.database.getAccount('splinterlands')).name}`);
    await timeout(5 * 1000);
    clientE.destroy(); // Clears intervals

    log('FINISHED');
};

main();
