import { UsageTracker } from '../utils/usageTracker';
import { timeout } from '../utils/utils';

describe('UsageTracker throttling tests', function () {
    const step = 20;

    let tracker: UsageTracker;
    beforeEach(() => {
        tracker = new UsageTracker(2, step);
    });

    afterEach(() => {
        tracker.stop();
    });

    it('Allows one to go through', () => {
        expect(tracker.throttle('a')).toBeFalsy();
    });

    it('Allows two  to go through', () => {
        expect(tracker.throttle('a')).toBeFalsy();
        expect(tracker.throttle('a')).toBeFalsy();
    });

    it('Limits after 2', () => {
        expect(tracker.throttle('a')).toBeFalsy();
        expect(tracker.throttle('a')).toBeFalsy();
        expect(tracker.throttle('a')).toBeTruthy();
    });

    it('Limits after 2', () => {
        expect(tracker.throttle('a')).toBeFalsy();
        expect(tracker.throttle('a')).toBeFalsy();
        expect(tracker.throttle('a')).toBeTruthy();
    });

    it('Ages out after half step', async () => {
        expect(tracker.throttle('a')).toBeFalsy();
        await timeout(step * 0.55); // Slightly more to deal with scheduler resolution clamping
        expect(tracker.throttle('a')).toBeFalsy();
        expect(tracker.throttle('a')).toBeTruthy();
        await timeout(step * 0.55); // Slightly more to deal with scheduler resolution clamping
        expect(tracker.throttle('a')).toBeFalsy();
        expect(tracker.throttle('a')).toBeTruthy();
    });

    it('Ages out after two steps', async () => {
        expect(tracker.throttle('a')).toBeFalsy();
        expect(tracker.throttle('a')).toBeFalsy();
        expect(tracker.throttle('a')).toBeTruthy();
        await timeout(step * 2.1); // Slightly more to deal with scheduler resolution clamping
        expect(tracker.throttle('a')).toBeFalsy();
        expect(tracker.throttle('a')).toBeFalsy();
        expect(tracker.throttle('a')).toBeTruthy();
    });

    it('Multiple accounts are tracked separately', () => {
        expect(tracker.throttle('a')).toBeFalsy();
        expect(tracker.throttle('b')).toBeFalsy();
        expect(tracker.throttle('b')).toBeFalsy();
        expect(tracker.throttle('b')).toBeTruthy();
        expect(tracker.throttle('a')).toBeFalsy();
        expect(tracker.throttle('a')).toBeTruthy();
    });
});
