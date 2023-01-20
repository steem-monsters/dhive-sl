import { TEST_CLIENT } from './common';

describe('hive-engine api', function () {
    // this.slow(500);
    // this.timeout(20 * 1000);

    // BLOCKCHAIN

    it('should get the latest block of the sidechain', async () => {
        const response = await TEST_CLIENT.engine.blockchain.getLatestBlock();
        expect(response).not.toBe(null);
    });

    it('should get the specified block from the sidechain', async () => {
        const response = await TEST_CLIENT.engine.blockchain.getBlock(1);
        expect(response.blockNumber).toBe(1);
    });

    it('should get status', async () => {
        const response = await TEST_CLIENT.engine.blockchain.getStatus();
        expect(response.chainId).toEqual('mainnet-hive');
    });

    // CONTRACTS

    it('should get the contract information via callback', (done) => {
        TEST_CLIENT.engine.contracts.getContract('tokens', (err, res) => {
            expect(err).toBe(null);
            expect(res._id).toBe('tokens');
            done();
        });
    });

    it('should get the contract information via promise', async () => {
        const response = await TEST_CLIENT.engine.contracts.getContract('tokens');
        expect(response._id).toBe('tokens');
    });

    it('should get the contract information', async () => {
        const response = await TEST_CLIENT.engine.tokens.getContract();
        expect(response._id).toBe('tokens');
    });

    // TOKENS

    it('should get BEE balance for aggroed', async () => {
        const account = 'aggroed';
        const symbol = 'BEE';

        const response = await TEST_CLIENT.engine.tokens.getAccountBalance(account, symbol);
        expect(response.account).toEqual(account);
        expect(response.symbol).toEqual(symbol);
    });

    it('should get balances', async () => {
        const account = 'aggroed';
        const symbols = ['SWAP.HIVE', 'BEE'];

        const response = await TEST_CLIENT.engine.tokens.getAccountBalances(account, symbols);
        expect(response[0].symbol).toEqual('SWAP.HIVE');
        expect(response[1].symbol).toEqual('BEE');
    });

    it('should get tokens', async () => {
        const response = await TEST_CLIENT.engine.tokens.getTokens({ limit: 10 });
        expect(response[0].symbol).toBe('BEE');
        expect(response[1].symbol).toBe('SWAP.HIVE');
        expect(response[2].symbol).toBe('ORB');
        expect(response[3].symbol).toBe('ALPHA');
        expect(response[4].symbol).toBe('BETA');
        expect(response[5].symbol).toBe('UNTAMED');
        expect(response[6].symbol).toBe('DEC');
        expect(response[7].symbol).toBe('SWAP.BTC');
        expect(response[8].symbol).toBe('SWAP.LTC');
        expect(response[9].symbol).toBe('SWAP.DOGE');
    });

    it('should get tokens via pagination', async () => {
        let response = await TEST_CLIENT.engine.tokens.getTokens({ limit: 2 });
        expect(response[0].symbol).toBe('BEE');
        expect(response[1].symbol).toBe('SWAP.HIVE');
        response = await TEST_CLIENT.engine.tokens.getTokens({ limit: 2, offset: 2 });
        expect(response[0].symbol).toBe('ORB');
        expect(response[1].symbol).toBe('ALPHA');
        response = await TEST_CLIENT.engine.tokens.getTokens({ limit: 2, offset: 4 });
        expect(response[0].symbol).toBe('BETA');
        expect(response[1].symbol).toBe('UNTAMED');
    });

    it('should get a specific token', async () => {
        const response = await TEST_CLIENT.engine.tokens.getToken('DEC');
        expect(response.symbol).toBe('DEC');
    });
});
// hive.fund
