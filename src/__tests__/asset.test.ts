import { Asset, Price, RCAsset, RCS_PER_RC, getVestingSharePrice } from '..';

describe('asset', function () {
    it('should create from string', function () {
        const oneHive = Asset.fromString('1.000 HIVE');
        expect(oneHive.amount).toEqual(1);
        expect(oneHive.symbol).toEqual('HIVE');
        const vests = Asset.fromString('0.123456 VESTS');
        expect(vests.amount).toEqual(0.123456);
        expect(vests.symbol).toEqual('VESTS');
        const hbd = Asset.from('0.444 HBD');
        expect(hbd.amount).toEqual(0.444);
        expect(hbd.symbol).toEqual('HBD');
    });

    it('should convert to string', function () {
        const hive = new Asset(44.999999, 'HIVE');
        expect(hive.toString()).toEqual('45.000 HIVE');
        const vests = new Asset(44.999999, 'VESTS');
        expect(vests.toString()).toEqual('44.999999 VESTS');
    });

    it('should add and subtract', function () {
        const a = new Asset(44.999, 'HIVE');
        expect(a.subtract(1.999).toString()).toEqual('43.000 HIVE');
        expect(a.add(0.001).toString()).toEqual('45.000 HIVE');
        expect(Asset.from('1.999 HIVE').subtract(a).toString()).toEqual('-43.000 HIVE');
        expect(Asset.from(a).subtract(a).toString()).toEqual('0.000 HIVE');
        expect(Asset.from('99.999999 VESTS').add('0.000001 VESTS').toString()).toEqual('100.000000 VESTS');
        expect(() => Asset.fromString('100.000 HIVE').subtract('100.000000 VESTS')).toThrow();
        expect(() => Asset.from(100, 'VESTS').add(a)).toThrow();
        expect(() => Asset.from(100).add('1.000000 VESTS')).toThrow();
    });

    it('should max and min', function () {
        const a = Asset.from(1),
            b = Asset.from(2);
        expect(Asset.min(a, b)).toEqual(a);
        expect(Asset.min(b, a)).toEqual(a);
        expect(Asset.max(a, b)).toEqual(b);
        expect(Asset.max(b, a)).toEqual(b);
    });

    it('should throw on invalid values', function () {
        expect(() => Asset.fromString('1.000 SNACKS')).toThrow();
        expect(() => Asset.fromString('I LIKE TURT 0.42')).toThrow();
        expect(() => Asset.fromString('Infinity HIVE')).toThrow();
        expect(() => Asset.fromString('..0 HIVE')).toThrow();
        expect(() => Asset.from('..0 HIVE')).toThrow();
        expect(() => Asset.from(NaN)).toThrow();
        expect(() => Asset.from(false as any)).toThrow();
        expect(() => Asset.from(Infinity)).toThrow();
        expect(() => Asset.from({ bar: 22 } as any)).toThrow();
    });

    it('should parse price', function () {
        const price1 = new Price(Asset.from('1.000 HIVE'), Asset.from(1, 'HBD'));
        const price2 = Price.from(price1);
        const price3 = Price.from({ base: '1.000 HIVE', quote: price1.quote });
        expect(price1.toString()).toEqual('1.000 HIVE:1.000 HBD');
        expect(price2.base.toString()).toEqual(price3.base.toString());
        expect(price2.quote.toString()).toEqual(price3.quote.toString());
    });

    it('should get vesting share price', function () {
        const props: any = {
            total_vesting_fund_hive: '5.000 HIVE',
            total_vesting_shares: '12345.000000 VESTS',
        };
        const price1 = getVestingSharePrice(props);
        expect(price1.base.amount).toEqual(12345);
        expect(price1.base.symbol).toEqual('VESTS');
        expect(price1.quote.amount).toEqual(5);
        expect(price1.quote.symbol).toEqual('HIVE');
        const badProps: any = {
            total_vesting_fund_hive: '0.000 HIVE',
            total_vesting_shares: '0.000000 VESTS',
        };
        const price2 = getVestingSharePrice(badProps);
        expect(price2.base.amount).toEqual(1);
        expect(price2.base.symbol).toEqual('VESTS');
        expect(price2.quote.amount).toEqual(1);
        expect(price2.quote.symbol).toEqual('HIVE');
    });

    it('should convert price', function () {
        const price1 = new Price(Asset.from('0.500 HIVE'), Asset.from('1.000 HBD'));
        const v1 = price1.convert(Asset.from('1.000 HIVE'));
        expect(v1.amount).toEqual(2);
        expect(v1.symbol).toEqual('HBD');
        const v2 = price1.convert(Asset.from('1.000 HBD'));
        expect(v2.amount).toEqual(0.5);
        expect(v2.symbol).toEqual('HIVE');
        expect(() => {
            price1.convert(Asset.from(1, 'VESTS'));
        }).toThrow();
    });

    it('should get RC', () => {
        const rc = RCAsset.from(5, 'RC');
        expect(rc.amount).toEqual(5);
        expect(rc.symbol).toEqual('RC');

        const rcs = rc.toSatoshi();
        expect(rcs.amount).toEqual(rc.amount * RCS_PER_RC);

        const rc2 = rcs.fromSatoshi();
        expect(rc2.amount).toEqual(rcs.amount / RCS_PER_RC);
    });
});
