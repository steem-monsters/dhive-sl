import { TimerType } from './utils';
import { clearTimeout } from 'timers';

export type UsageTrackerParameters = {
    /**
     * Maximum amount of outstanding operations per account
     * Default: 5
     */
    limit?: number;

    /**
     * Amount of time in milliseconds to wait before aging out an outstanding operation.
     * Idling for twice this amount of time will lead to all outstanding operations being aged out.
     * Default: 3000
     */
    ms?: number;
};

export class UsageTracker {
    private readonly usedAccounts = new Map<string, Array<number>>();
    private idleTimer?: TimerType;

    public constructor(private readonly limit = 5, private readonly ms = 3000) {}

    private readonly onIdle = () => {
        this.usedAccounts.clear();
    };

    private clearIdle() {
        clearTimeout(this.idleTimer);
    }

    private setIdle() {
        this.clearIdle();
        this.idleTimer = setTimeout(this.onIdle, 2 * this.ms);
    }

    /**
     * Sequentially drop values from the front of `arr` until the first value bigger than `ts` is encountered.
     * Does nothing when the first element of `arr` is bigger than `ts`.
     * Empties out `arr` if no such element exists.
     * @param arr - a mostly-sorted array
     * @param ts - a unix timestamp value, in milliseconds. Defaults to Date.now()
     * @private
     */
    private static dropUntilMoment(arr: Array<number>, ts = Date.now()) {
        const dropUntil = arr.findIndex((v) => v > ts);
        if (dropUntil > 0) {
            arr.splice(0, dropUntil);
        } else if (dropUntil < 0) {
            // This is a performant way of emptying out an array passed by reference
            arr.length = 0;
        }
    }

    private shouldThrottle(account: string) {
        const arr = this.usedAccounts.get(account) ?? [];
        const now = Date.now();
        UsageTracker.dropUntilMoment(arr, now);

        if (arr.length >= this.limit) {
            return true;
        }

        arr.push(now + this.ms);
        this.usedAccounts.set(account, arr);
        return false;
    }

    /**
     * Return true if account has exceeded limits regarding outstanding operations for now.
     * Add one entry to the internal list of outstanding operations and return false otherwise.
     * @param account
     */
    public throttle(account: string) {
        this.clearIdle();
        const shouldThrottle = this.shouldThrottle(account);
        this.setIdle();
        return shouldThrottle;
    }

    public stop() {
        this.clearIdle();
    }
}
