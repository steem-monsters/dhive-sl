import { Client } from '../index';
import { log, timeout } from '../utils';

const main = async () => {
    // No config client
    const client0 = new Client();
    await client0.loadNodes();
    log(`0 - No config client: ${(await client0.database.getAccount('splinterlands')).name}`);

    await timeout(3 * 1000);

    // Client with pre-set nodes only
    const clientA = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'] });
    log(`A - Client with pre-set nodes only: ${(await clientA.database.getAccount('splinterlands')).name}`);
    await timeout(3 * 1000);

    // Client with pre-set set nodes as well as manual beacon nodes loading and WITH interval
    const clientB = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'], beacon: { intervalTime: 2 } });
    log(`B - Client with pre-set set nodes as well as manual beacon nodes loading and WITH interval: ${(await clientB.database.getAccount('splinterlands')).name}`);
    await clientB.loadNodes();
    await timeout(5 * 1000);
    clientB.destroy(); // Clears intervals

    // Client with pre-set set nodes as well as manual beacon nodes loading but WITHOUT interval
    const clientC = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'], beacon: { mode: 'manual' } });
    log(`C - Client with pre-set set nodes as well as manual beacon nodes loading but WITHOUT interval: ${(await clientC.database.getAccount('splinterlands')).name}`);
    await clientC.loadNodes();
    await timeout(5 * 1000);

    // Client with pre-set set nodes as well as loadOnInitialize beacon nodes loading and WITH interval
    const clientD = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'], beacon: { intervalTime: 2, loadOnInitialize: true } });
    log(`D - Client with pre-set set nodes as well as loadOnInitialize beacon nodes loading and WITH interval: ${(await clientD.database.getAccount('splinterlands')).name}`);
    await timeout(5 * 1000);
    clientD.destroy(); // Clears intervals

    // Client with pre-set set nodes as well as loadOnInitialize beacon nodes loading and WITH interval
    const clientE = new Client({ beacon: { intervalTime: 2, loadOnInitialize: true } });
    log(`E - Client only with beacon nodes and WITH interval: ${(await clientE.database.getAccount('splinterlands')).name}`);
    await timeout(5 * 1000);
    clientE.destroy(); // Clears intervals

    log('FINISHED');
};

main();
