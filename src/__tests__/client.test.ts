import { VError } from 'verror';
import { Client } from '..';

describe('client', function () {
    // this.slow(200);
    jest.setTimeout(30 * 1000);

    // const client = Client.testnet();
    const client = new Client('https://api.hive.blog');

    // TODO: change api.hive.blog to testnet
    it('should handle failover', async () => {
        const bclient = new Client(['https://wrongapi.hive.blog', 'https://api.hive.blog'], { timeout: 1000, rpcErrorLimit: 1 });
        const result = await bclient.call('condenser_api', 'get_accounts', [['initminer']]);
        expect(result.length).toEqual(1);
        expect(result[0].name).toEqual('initminer');
    });

    it('should make rpc call', async function () {
        const result = await client.database.getAccount('initminer');
        expect(result?.name).toEqual('initminer');
    });

    it('should handle rpc errors', async function () {
        try {
            await client.call('condenser_api', 'i_like_turtles');
            expect(false).toBeTruthy();
        } catch (error: any) {
            expect(error.name).toEqual('RPCError');
            expect(
                error.message === `itr != _by_name.end(): no method with name 'i_like_turtles'` ||
                    error.message === `method_itr != api_itr->second.end(): Could not find method i_like_turtles`,
            ).toBeTruthy();

            const info = VError.info(error);
            expect(info.code).toEqual(10);
            expect(info.name).toEqual('assert_exception');
        }
    });

    it('should format rpc errors', async function () {
        const tx = { operations: [['witness_update', {}]] };
        try {
            await client.call('condenser_api', 'broadcast_transaction', [tx]);
            expect(false).toBeTruthy();
        } catch (error: any) {
            expect(error.name).toEqual('RPCError');
            expect(error.message).toEqual('is_valid_account_name( name ): Account name ${n} is invalid n=');
            const info = VError.info(error);
            expect(info.code).toEqual(10);
            expect(info.name).toEqual('assert_exception');
        }
    });

    // bs, needs rework
    // it("should retry and timeout", async function() {
    //   this.slow(2500);
    //   aclient.timeout = 1000;
    //   aclient.address = "https://jnordberg.github.io/dhive/FAIL";
    //   const backoff = aclient.backoff;
    //   let seenBackoff = false;
    //   aclient.backoff = tries => {
    //     seenBackoff = true;
    //     return backoff(tries);
    //   };
    //   const tx = { operations: [["witness_update", {}]] };
    //   try {
    //     await client.database.getChainProperties();
    //     assert(false, "should not be reached");
    //   } catch (error) {
    //     assert(seenBackoff, "should have seen backoff");
    //   }
    // });
});
