import { LogLevel, WrappedPseudoInterval, log, setSingleEntryInterval } from './utils';
import { PrivateKeyArg } from '../chain/keys';
import { UsageTracker, UsageTrackerParameters } from './usageTracker';

type TransactionCallback<T = any> = (data: T, key: PrivateKeyArg) => unknown;

interface TxInQueue {
    data: any;
    key: PrivateKeyArg;
    txCall?: TransactionCallback;
}

export class TransactionQueue extends UsageTracker {
    private static readonly QueueTimout = 1000;

    /**
     * Transaction queue for customJsons
     */
    private transactionQueue: TxInQueue[] = [];

    /**
     * Recursive setTimeout for transactionQueue
     */
    private transactionQueueInterval?: WrappedPseudoInterval;

    constructor(params?: UsageTrackerParameters, skipTransactionQueue?: boolean) {
        super(params?.limit, params?.ms);

        if (!skipTransactionQueue)
            this.transactionQueueInterval = setSingleEntryInterval(() => {
                this.processTransactionQueue();
            }, TransactionQueue.QueueTimout);
    }

    public queueTransaction<T = any>(data: any, key: PrivateKeyArg, txCall?: TransactionCallback<T>) {
        this.transactionQueue.push({ data, key, txCall });
    }

    public peekTransactionAccount(): string | undefined | null {
        return this.transactionQueue?.[0]?.data?.account;
    }

    public processTransactionQueue() {
        while (true) {
            const peekAccount = this.peekTransactionAccount();
            if (!peekAccount) return;

            if (this.throttle(peekAccount)) {
                return;
            }

            const item = this.transactionQueue.shift();
            if (item) {
                log(`Processing queue item ${item.data.id}`, LogLevel.Debug);
                if (item.txCall) {
                    item.txCall(item.data, item.key);
                }
            }
        }
    }

    public stop() {
        super.stop();
        clearInterval(this.transactionQueueInterval?.interval);
    }
}
