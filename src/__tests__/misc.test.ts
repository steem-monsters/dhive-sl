import assert from 'assert';
import * as stream from 'stream';
import { utils } from '..';

describe('misc', function () {
    describe('iteratorStream', function () {
        async function* counter(to: number) {
            for (let i = 0; i < to; i++) {
                yield { i };
            }
        }

        async function* errorCounter(to: number, errorAt: number) {
            for (let i = 0; i < to; i++) {
                yield { i };
                if (errorAt === i) {
                    throw new Error('Oh noes');
                }
            }
        }

        it('should handle backpressure', async function () {
            // this.slow(500);
            await new Promise((resolve) => {
                const s1 = new stream.PassThrough({
                    highWaterMark: 10,
                    objectMode: true,
                });
                const s2 = utils.iteratorStream(counter(100));
                s2.pipe(s1);
                setTimeout(() => {
                    let c = 0;
                    s1.on('data', (d: any) => {
                        c = d.i;
                    });
                    s1.on('end', () => {
                        assert.equal(c, 99);
                        resolve(true);
                    });
                }, 50);
            });
        });

        it('should handle errors', async function () {
            await new Promise((resolve) => {
                const s = utils.iteratorStream(errorCounter(10, 2));
                let last = 0;
                let sawError = false;
                s.on('data', (d) => {
                    last = d.i;
                });
                s.on('error', () => {
                    assert.equal(last, 2);
                    sawError = true;
                });
                s.on('end', () => {
                    assert(sawError);
                    resolve(true);
                });
            });
        });
    });
});
