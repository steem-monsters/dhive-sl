// Originally from hive-js - https://gitlab.syncad.com/hive/hive-js

import { PublicKeyHiveJs } from './publickey';

export class FastParser {
    static fixedData(b, len, buffer?: any) {
        if (!b) {
            return;
        }
        if (buffer) {
            const data = buffer.slice(0, len).toString('binary');
            b.append(data, 'binary');
            while (len-- > data.length) {
                b.writeUint8(0);
            }
        } else {
            const b_copy = b.copy(b.offset, b.offset + len);
            b.skip(len);
            return Buffer.from(b_copy.toBinary(), 'binary');
        }
        return;
    }

    static publicKey(b, publicKey?: PublicKeyHiveJs) {
        if (!b) {
            return;
        }
        if (publicKey) {
            const buffer = publicKey.toBuffer();
            b.append(buffer.toString('binary'), 'binary');
            return;
        } else {
            const buffer = FastParser.fixedData(b, 33);
            return PublicKeyHiveJs.fromBuffer(buffer);
        }
    }

    static ripemd160(b, ripemd160) {
        if (!b) {
            return;
        }
        if (ripemd160) {
            FastParser.fixedData(b, 20, ripemd160);
            return;
        } else {
            return FastParser.fixedData(b, 20);
        }
    }

    static time_point_sec(b, epoch) {
        if (epoch) {
            epoch = Math.ceil(epoch / 1000);
            b.writeInt32(epoch);
            return;
        } else {
            epoch = b.readInt32(); // fc::time_point_sec
            return new Date(epoch * 1000);
        }
    }
}
