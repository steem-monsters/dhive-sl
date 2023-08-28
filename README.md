# dhive-sl

Client library for the Hive blockchain & Hive Engine layer2.

---

## Installation

```
npm install dhive-sl
```

## Usage

```Typescript
import { Client } from 'dhive-sl';

const main = async () => {
    // Client
    const client = new Client()
    // (Optional) const client = new Client({ nodes: ['api.hive.blog', 'api.deathwing.me', 'anyx.io'] })

    // Getting data from Hive
    const account = await client.database.getAccount('splinterlands')

    // Encoding & decoding memos
    const encoded = await client.memo.encode('test', 'pub-key-B', 'private-key-A')
    const decoded = await client.memo.decode(encoded, 'private-key-B')

    // Getting data from Hive Engine (layer2 of Hive)
    const block = await client.engine.blockchain.getLatestBlock()
};

main();
```

## Note

This version is a fork of [dhive](https://gitlab.syncad.com/hive/dhive), which was originally created by [Johan Nordberg](https://github.com/jnordberg) in 2017 and maintained since 2021 by the Hive community.

`dhive-sl` was forked to improve dhive as well as merge the functionality of & improve upon [hive-js](https://gitlab.syncad.com/hive/hive-js), [sscjs](https://github.com/harpagon210/sscjs) and [hive-interface](https://github.com/steem-monsters/hive-interface).
