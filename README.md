# dhive-sl

Fork of [dhive](https://gitlab.syncad.com/hive/dhive), which was originally created by [Johan Nordberg](https://github.com/jnordberg) in 2017 and maintained since 2021 by the Hive community. `dhive-sl` was forked to merge [hive-interface](https://github.com/steem-monsters/hive-interface) with dhive and customize and improve upon it for the needs of the Splinterlands ecosystem.

---

## Installation

### Via npm

For node.js or the browser with [browserify](https://github.com/substack/node-browserify) or [webpack](https://github.com/webpack/webpack).

```
npm install @splinterlands/dhive-sl
```

## Usage

With TypeScript:

```typescript
import { Client } from '@splinterlands/dhive-sl';

const client = new Client(['https://api.hive.blog', 'https://api.hivekings.com', 'https://anyx.io', 'https://api.openhive.network']);

for await (const block of client.blockchain.getBlocks()) {
    console.log(`New block, id: ${block.block_id}`);
}
```

With JavaScript:

```javascript
let dhive = require('@splinterlands/dhive-sl');

let client = new dhive.Client(['https://api.hive.blog', 'https://api.hivekings.com', 'https://anyx.io', 'https://api.openhive.network']);
let key = dhive.PrivateKey.fromLogin('username', 'password', 'posting');

client.broadcast
    .vote(
        {
            voter: 'username',
            author: 'almost-digital',
            permlink: 'dhive-is-the-best',
            weight: 10000,
        },
        key,
    )
    .then(
        function (result) {
            console.log('Included in block: ' + result.block_num);
        },
        function (error) {
            console.error(error);
        },
    );
```

With ES2016 (node.js 7+):

```javascript
const { Client } = require('@splinterlands/dhive-sl');

const client = new Client(['https://api.hive.blog', 'https://api.hivekings.com', 'https://anyx.io', 'https://api.openhive.network']);

async function main() {
    const props = await client.database.getChainProperties();
    console.log(`Maximum blocksize consensus: ${props.maximum_block_size} bytes`);
    client.disconnect();
}

main().catch(console.error);
```
