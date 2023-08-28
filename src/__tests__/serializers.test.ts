import { ByteBuffer } from '../crypto/bytebuffer';
import { Serializer, Types } from '..';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

/*
 Serializer tests in the format:
 [{"name": "Type[::Subtype]", "values": [["expected output as hex string", <value>]]}]
*/
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serializerTests = require('./serializer-tests.json');

function serialize(serializer: Serializer, data: any) {
    const buffer = new ByteBuffer();
    serializer(buffer, data);
    buffer.flip();
    return bytesToHex(Uint8Array.from(buffer.toBuffer()));
}

describe('serializers', function () {
    for (const test of serializerTests) {
        it(test.name, () => {
            let serializer: Serializer;
            if (test.name.indexOf('::') === -1) {
                serializer = Types[test.name];
            } else {
                const [base, ...sub] = test.name.split('::').map((t) => Types[t]);
                serializer = base(...sub);
            }
            for (const [expected, value] of test.values) {
                const actual = serialize(serializer, value);
                expect(actual).toEqual(expected);
            }
        });
    }

    it('Binary', function () {
        const data = hexToBytes('026400c800');
        const r1 = serialize(Types.Binary(), Uint8Array.from([0x80, 0x00, 0x80]));
        expect(r1).toEqual('03800080');
        const r2 = serialize(Types.Binary(), hexToBytes('026400c800'));
        expect(r2).toEqual('05026400c800');
        const r3 = serialize(Types.Binary(5), data);
        expect(r3).toEqual('026400c800');
        expect(() => {
            serialize(Types.Binary(10), data);
        }).toThrow();
    });

    it('Void', function () {
        expect(() => {
            serialize(Types.Void, null);
        }).toThrow();
    });

    it('Invalid Operations', function () {
        expect(() => {
            serialize(Types.Operation, ['transfer', {}]);
        }).toThrow();
        expect(() => {
            serialize(Types.Operation, ['transfer', { from: 1 }]);
        }).toThrow();
        expect(() => {
            serialize(Types.Operation, ['transfer', 10]);
        }).toThrow();
    });
});
