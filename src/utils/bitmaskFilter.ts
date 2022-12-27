import JSBI from 'jsbi';
import { OPERATION_IDS } from './constants';
import { OperationName, VirtualOperationName } from '../chain';

export const makeBitMaskFilter = (operationNames: (OperationName | VirtualOperationName)[]): [number, number] => {
    const operationIds: number[] = [];
    operationNames.map((operationName) => {
        const operationId = OPERATION_IDS[operationName];
        if (!Number.isNaN(operationId)) operationIds.push(operationId);
    });

    return operationIds.reduce(redFunction as any, [JSBI.BigInt(0), JSBI.BigInt(0)]).map((value) => (JSBI.notEqual(value, JSBI.BigInt(0)) ? value.toString() : null)) as any;
};

const redFunction = ([low, high], operationId) => {
    if (operationId < 64) {
        return [JSBI.bitwiseOr(low, JSBI.leftShift(JSBI.BigInt(1), JSBI.BigInt(operationId))), high];
    } else {
        return [low, JSBI.bitwiseOr(high, JSBI.leftShift(JSBI.BigInt(1), JSBI.BigInt(operationId - 64)))];
    }
};
