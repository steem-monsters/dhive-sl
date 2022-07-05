# dhive-sl

Fork of [dhive](https://gitlab.syncad.com/hive/dhive), which was originally created by [Johan Nordberg](https://github.com/jnordberg) in 2017 and maintained since 2021 by the Hive community. `dhive-sl` was forked to merge [hive-interface](https://github.com/steem-monsters/hive-interface) with dhive and customize and improve upon it for the needs of the Splinterlands ecosystem.

---

## Installation

### Via npm

For node.js or the browser with [browserify](https://github.com/substack/node-browserify) or [webpack](https://github.com/webpack/webpack).

```
npm install splinterlands-dhive-sl
```

## Usage

```Typescript
// Based on src/examples/beacon.example.ts
// npm run example:beacon

import { Client, utils } from 'splinterlands-dhive-sl';

const main = async () => {
     /**
     * Client 0 with no config
     * Beacon service is used to load the best RPC nodes
     * Nodes are refreshed every 300 seconds (5 Minutes) after loadNodes()
     */
    const client0 = new Client();
    await client0.loadNodes();
    utils.log(`0 - No config client: ${(await client0.database.getAccount('splinterlands')).name}`);
    await utils.timeout(3 * 1000);

    /**
     * Client A with pre-defined nodes
     * Beacon service is NOT used
     */
    const clientA = new Client({ nodes: ['wrong.hive-api.com', 'hived.splinterlands.com', 'hived-2.splinterlands.com'] });
    utils.log(`A - Client: ${(await clientA.database.getAccount('splinterlands')).name}`);
    await utils.timeout(3 * 1000);

    /**
     * Client B with pre-defined nodes
     * Beacon service is used to load the best RPC nodes
     * Nodes are refreshed every 2 seconds after loadNodes()
     */
    const clientB = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'], beacon: { intervalTime: 2 } });
    await clientB.loadNodes();
    utils.log(`B - Client: ${(await clientB.database.getAccount('splinterlands')).name}`);
    await utils.timeout(5 * 1000);
    clientB.destroy(); // Clears intervals

    /**
     * Client C with pre-defined nodes
     * Beacon service is used to load the best RPC nodes
     * Nodes are NOT refreshed due to 'manual' mode
     */
    const clientC = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'], beacon: { mode: 'manual' } });
    await clientC.loadNodes();
    utils.log(`C - Client: ${(await clientC.database.getAccount('splinterlands')).name}`);
    await utils.timeout(5 * 1000);

    /**
     * Client D with pre-defined nodes
     * Beacon service is used ON NEW CLIENT (due to loadOnInitialize) to load the best RPC nodes
     * Nodes are refreshed every 2 seconds after new Client()
     */
    const clientD = new Client({ nodes: ['hived.splinterlands.com', 'hived-2.splinterlands.com'], beacon: { intervalTime: 2, loadOnInitialize: true } });
    utils.log(`D - Client: ${(await clientD.database.getAccount('splinterlands')).name}`);
    await utils.timeout(5 * 1000);
    clientD.destroy(); // Clears intervals

    /**
     * Client E with NO pre-defined nodes
     * Beacon service is used ON NEW CLIENT (due to loadOnInitialize) to load the best RPC nodes
     * Nodes are refreshed every 2 seconds after new Client()
     */
    const clientE = new Client({ beacon: { intervalTime: 2, loadOnInitialize: true } });
    utils.log(`E - Client: ${(await clientE.database.getAccount('splinterlands')).name}`);
    await utils.timeout(5 * 1000);
    clientE.destroy(); // Clears intervals

    utils.log('FINISHED');
};

main();
```
