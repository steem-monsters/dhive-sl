export type HiveEngineMethodName = 'getLatestBlockInfo' | 'getContract' | 'findOne' | 'find' | 'getLatestBlockInfo' | 'getBlockInfo' | 'getTransactionInfo' | 'getStatus';

export type HiveEngineAssetSymbol = 'SWAP.HIVE' | 'BEE' | 'DEC' | 'ALPHA' | 'BETA' | 'UNTAMED' | 'CHAOS' | string;

export interface HiveEngineRequest {
    method: HiveEngineMethodName;
    params?: Record<string, any>;
}

export type HiveEngineContractName =
    | 'tokens'
    | 'market'
    | 'marketpools'
    | 'nft'
    | 'nftmarket'
    | 'botcontroller'
    | 'packmanager'
    | 'mining'
    | 'airdrops'
    | 'claimdrops'
    | 'nftairdrops'
    | 'distribution'
    | 'witnesses'
    | 'nftauction'
    | 'comments';

export type HiveEngineTableName =
    | HiveEngineTokensTableName
    | HiveEngineMarketTableName
    | HiveEngineMarketPoolsTableName
    | HiveEngineDistributionTableName
    | HiveEngineNftTableName
    | HiveEngineNftMarketTableName
    | HiveEngineWitnessesTableName;

export type HiveEngineTokensTableName = 'tokens' | 'balances' | 'delegations' | 'pendingUnstakes' | 'pendingUndelegations';
export type HiveEngineMarketTableName = 'buyBook' | 'sellBook' | 'tradesHistory' | 'metrics';
export type HiveEngineMarketPoolsTableName = 'params' | 'pools' | 'liquidityPositions' | 'tradesHistory' | 'metrics';
export type HiveEngineDistributionTableName = 'params' | 'batches';
export type HiveEngineNftTableName = 'params' | 'nfts' | 'pendingUndelegations' | 'SYMBOLinstances';
export type HiveEngineNftMarketTableName = 'params' | 'sellBook' | 'openInterest' | 'tradesHistory';
export type HiveEngineWitnessesTableName = 'params' | 'witnesses' | 'accounts' | 'approvals' | 'schedules';

export type HiveEngineContractAction = HiveEngineTokensContractAction | HiveEngineMarketContractAction | HiveEngineMarketPoolsContractAction;

export type HiveEngineTokensContractAction =
    | 'create'
    | 'issue'
    | 'transfer'
    | 'transferToContract'
    | 'transferOwnership'
    | 'updateUrl'
    | 'updateMetadata'
    | 'enableStaking'
    // tokens - staking
    | 'stake'
    | 'unstake'
    | 'cancelUnstake'
    // tokens - delegation
    | 'enableDelegation'
    | 'delegate'
    | 'undelegate'
    // tokens - tokens
    | 'updatePrecision';

export type HiveEngineMarketContractAction = 'buy' | 'sell' | 'marketBuy' | 'marketSell' | 'cancel';
export type HiveEngineMarketPoolsContractAction = 'createPool' | 'swapTokens' | 'addLiquidity' | 'removeLiquidity' | 'createRewardPool' | 'setRewardPoolActive';

// market

/**
 * Generic operation.
 */
export interface HiveEngineOperation {
    0: HiveEngineContractName;
    1: HiveEngineContractAction;
    2: { [key: string]: any };
}

export interface HiveEngineOperationJson {
    contractName: HiveEngineOperation[0];
    contractAction: HiveEngineOperation[1];
    contractPayload: HiveEngineOperation[2];
}

// Staking

export interface HiveEngineTokensEnableStakingOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'enableStaking';
    2: {
        symbol: string;
        unstakingCooldown: number;
        numberTransactions: number;
    };
}

export interface HiveEngineTokensStakeOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'stake';
    2: {
        to: string;
        symbol: string;
        quantity: string;
    };
}

export interface HiveEngineTokensUnstakeOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'unstake';
    2: {
        symbol: string;
        quantity: string;
    };
}

export interface HiveEngineTokensCancelUnstakeOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'cancelUnstake';
    2: {
        txID: string;
    };
}

// Delegation

export interface HiveEngineTokensEnableDelegationOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'enableDelegation';
    2: {
        symbol: string;
        undelegationCooldown: number;
    };
}

export interface HiveEngineTokensDelegateOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'delegate';
    2: {
        to: string;
        symbol: string;
        quantity: string;
    };
}

export interface HiveEngineTokensUndelegateOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'undelegate';
    2: {
        to: string;
        symbol: string;
        quantity: string;
    };
}

// Tokens

export interface HiveEngineTokensUpdatePrecisionOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'updatePrecision';
    2: {
        symbol: string;
        precision: number;
    };
}

// Other

export interface HiveEngineTokensCreateOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'create';
    2: {
        symbol: string;
        name: string;
        precision: number;
        maxSupply: string;
        url: string;
    };
}

export interface HiveEngineTokensIssueOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'issue';
    2: {
        symbol: string;
        to: string;
        quantity: string;
    };
}

export interface HiveEngineTokensTransferOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'transfer';
    2: {
        symbol: string;
        to: string;
        quantity: string;
    };
}

export interface HiveEngineTokensTransferToContractOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'transferToContract';
    2: {
        symbol: string;
        to: string;
        quantity: string;
    };
}

export interface HiveEngineTokensTransferOwnershipOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'transferOwnership';
    2: {
        symbol: string;
        to: string;
    };
}

export interface HiveEngineTokensUpdateUrlOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'updateUrl';
    2: {
        symbol: string;
        url: string;
    };
}

export interface HiveEngineTokensUpdateMetadataOperation extends HiveEngineOperation {
    0: 'tokens';
    1: 'updateMetadata';
    2: {
        symbol: string;
        metadata: JSON;
    };
}
