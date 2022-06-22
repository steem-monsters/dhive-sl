import { Client } from '../index';
import { timeout } from '../utils';

const main = async () => {
    // Client with pre-set nodes only
    const clientA = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'] });
    console.log(`A - Client with pre-set nodes only: ${(await clientA.database.getAccount('splinterlands')).name}`);

    // Client with pre-set set nodes as well as manual beacon nodes loading and WITH interval
    const clientB = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'], beacon: { intervalTime: 2 } });
    await clientB.loadNodes();
    console.log(`B - Client with pre-set set nodes as well as manual beacon nodes loading and WITH interval: ${(await clientB.database.getAccount('splinterlands')).name}`);
    await timeout(5 * 1000);
    clientB.destroy(); // Clears intervals

    // Client with pre-set set nodes as well as manual beacon nodes loading but WITHOUT interval
    const clientC = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'], beacon: { mode: 'manual' } });
    await clientC.loadNodes();
    console.log(`C - Client with pre-set set nodes as well as manual beacon nodes loading but WITHOUT interval: ${(await clientC.database.getAccount('splinterlands')).name}`);
    await timeout(5 * 1000);

    // Client with pre-set set nodes as well as loadOnInitialize beacon nodes loading and WITH interval
    const clientD = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'], beacon: { intervalTime: 2, loadOnInitialize: true } });
    console.log(
        `D - Client with pre-set set nodes as well as loadOnInitialize beacon nodes loading and WITH interval: ${(await clientD.database.getAccount('splinterlands')).name}`,
    );
    await timeout(5 * 1000);
    clientD.destroy(); // Clears intervals
};

main();
