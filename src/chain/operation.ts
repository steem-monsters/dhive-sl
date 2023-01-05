import { Asset, PriceType } from './asset';
import { AuthorityType } from './account';
import { BeneficiaryRoute } from './hivemind';
import { ChainProperties } from './misc';
import { PublicKey } from './keys';
import { SignedBlockHeader } from './block';

/**
 * Operation name.
 * Ref: https://gitlab.syncad.com/hive/hive/-/blob/master/libraries/protocol/include/hive/protocol/operations.hpp
 */
export type OperationName = // <id>

        | 'vote' // 0
        | 'comment' // 1
        | 'transfer' // 2
        | 'transfer_to_vesting' // 3
        | 'withdraw_vesting' // 4
        | 'limit_order_create' // 5
        | 'limit_order_cancel' // 6
        | 'feed_publish' // 7
        | 'convert' // 8
        | 'account_create' // 9
        | 'account_update' // 10
        | 'witness_update' // 11
        | 'account_witness_vote' // 12
        | 'account_witness_proxy' // 13
        | 'pow' // 14
        | 'custom' // 15
        | 'report_over_production' // 16
        | 'delete_comment' // 17
        | 'custom_json' // 18
        | 'comment_options' // 19
        | 'set_withdraw_vesting_route' // 20
        | 'limit_order_create2' // 21
        | 'claim_account' // 22
        | 'create_claimed_account' // 23
        | 'request_account_recovery' // 24
        | 'recover_account' // 25
        | 'change_recovery_account' // 26
        | 'escrow_transfer' // 27
        | 'escrow_dispute' // 28
        | 'escrow_release' // 29
        | 'pow2' // 30
        | 'escrow_approve' // 31
        | 'transfer_to_savings' // 32
        | 'transfer_from_savings' // 33
        | 'cancel_transfer_from_savings' // 34
        | 'custom_binary' // 35
        | 'decline_voting_rights' // 36
        | 'reset_account' // 37
        | 'set_reset_account' // 38
        | 'claim_reward_balance' // 39
        | 'delegate_vesting_shares' // 40
        | 'account_create_with_delegation' // 41
        | 'witness_set_properties' // 42
        | 'account_update2' // 43
        | 'create_proposal' // 44
        | 'update_proposal_votes' // 45
        | 'remove_proposal' // 46
        | 'update_proposal' // 47
        | 'collateralized_convert' // 48
        | 'recurrent_transfer'; // 49

/**
 * Virtual operation name.
 */
export type VirtualOperationName = // <id>

        | 'fill_convert_request' // last_regular + 1
        | 'author_reward' // last_regular + 2
        | 'curation_reward' // last_regular + 3
        | 'comment_reward' // last_regular + 4
        | 'liquidity_reward' // last_regular + 5
        | 'interest' // last_regular + 6
        | 'fill_vesting_withdraw' // last_regular + 7
        | 'fill_order' // last_regular + 8
        | 'shutdown_witness' // last_regular + 9
        | 'fill_transfer_from_savings' // last_regular + 10
        | 'hardfork' // last_regular + 11
        | 'comment_payout_update' // last_regular + 12
        | 'return_vesting_delegation' // last_regular + 13
        | 'comment_benefactor_reward' // last_regular + 14
        | 'producer_reward' // last_regular + 15
        | 'clear_null_account_balance' // last_regular + 16
        | 'proposal_pay' // last_regular + 17
        | 'sps_fund' // last_regular + 18
        | 'hardfork_hive' // last_regular + 19
        | 'hardfork_hive_restore' // last_regular + 20
        | 'delayed_voting' // last_regular + 21
        | 'consolidate_treasury_balance' // last_regular + 22
        | 'effective_comment_vote' // last_regular + 23
        | 'ineffective_delete_comment' // last_regular + 24
        | 'sps_convert' // last_regular + 25
        | 'expired_account_notification' // last_regular + 26
        | 'changed_recovery_account' // last_regular + 27
        | 'transfer_to_vesting_completed' // last_regular + 28
        | 'pow_reward' // last_regular + 29
        | 'vesting_shares_split' // last_regular + 30
        | 'account_created' // last_regular + 31
        | 'fill_collateralized_convert_request' // last_regular + 32
        | 'system_warning' // last_regular + 33,
        | 'fill_recurrent_transfer' // last_regular + 34
        | 'failed_recurrent_transfer'; // last_regular + 35

/**
 * Generic operation.
 */
export interface Operation {
    0: OperationName | VirtualOperationName;
    1: Record<string, any>;
}

export interface AppliedOperation {
    trx_id: string;
    block: number;
    trx_in_block: number;
    op_in_trx: number;
    virtual_op: number;
    timestamp: string;
    op: Operation;
}

export interface AccountCreateOperation extends Operation {
    0: 'account_create';
    1: {
        fee: string | Asset;
        creator: string; // account_name_type
        new_account_name: string; // account_name_type
        owner: AuthorityType;
        active: AuthorityType;
        posting: AuthorityType;
        memo_key: string | PublicKey; // public_key_type
        json_metadata: string;
    };
}

export interface AccountCreateWithDelegationOperation extends Operation {
    0: 'account_create_with_delegation';
    1: {
        fee: string | Asset;
        delegation: string | Asset;
        creator: string; // account_name_type
        new_account_name: string; // account_name_type
        owner: AuthorityType;
        active: AuthorityType;
        posting: AuthorityType;
        memo_key: string | PublicKey; // public_key_type
        json_metadata: string;
        /**
         * Extensions. Not currently used.
         */
        extensions: any[];
    };
}

export interface AccountUpdateOperation extends Operation {
    0: 'account_update'; // 10
    1: {
        account: string; // account_name_type
        owner?: AuthorityType; // optional< authority >
        active?: AuthorityType; // optional< authority >
        posting?: AuthorityType; // optional< authority >
        memo_key: string | PublicKey; // public_key_type
        json_metadata: string;
    };
}

export interface AccountWitnessProxyOperation extends Operation {
    0: 'account_witness_proxy'; // 13
    1: {
        account: string; // account_name_type
        proxy: string; // account_name_type
    };
}

export interface AccountWitnessVoteOperation extends Operation {
    0: 'account_witness_vote'; // 12
    1: {
        account: string; // account_name_type
        witness: string; // account_name_type
        approve: boolean;
    };
}

export interface CancelTransferFromSavingsOperation extends Operation {
    0: 'cancel_transfer_from_savings'; // 34
    1: {
        from: string; // account_name_type
        request_id: number; // uint32_t
    };
}

/**
 * Each account lists another account as their recovery account.
 * The recovery account has the ability to create account_recovery_requests
 * for the account to recover. An account can change their recovery account
 * at any time with a 30 day delay. This delay is to prevent
 * an attacker from changing the recovery account to a malicious account
 * during an attack. These 30 days match the 30 days that an
 * owner authority is valid for recovery purposes.
 *
 * On account creation the recovery account is set either to the creator of
 * the account (The account that pays the creation fee and is a signer on the transaction)
 * or to the empty string if the account was mined. An account with no recovery
 * has the top voted witness as a recovery account, at the time the recover
 * request is created. Note: This does mean the effective recovery account
 * of an account with no listed recovery account can change at any time as
 * witness vote weights. The top voted witness is explicitly the most trusted
 * witness according to stake.
 */
export interface ChangeRecoveryAccountOperation extends Operation {
    0: 'change_recovery_account'; // 26
    1: {
        /**
         * The account that would be recovered in case of compromise.
         */
        account_to_recover: string; // account_name_type
        /**
         * The account that creates the recover request.
         */
        new_recovery_account: string; // account_name_type
        /**
         * Extensions. Not currently used.
         */
        extensions: any[]; // extensions_type
    };
}

export interface ClaimRewardBalanceOperation extends Operation {
    0: 'claim_reward_balance'; // 39
    1: {
        account: string; // account_name_type
        reward_hive: string | Asset;
        reward_hbd: string | Asset;
        reward_vests: string | Asset;
    };
}

export interface ClaimAccountOperation extends Operation {
    0: 'claim_account'; // 22
    1: {
        creator: string; // account_name_type
        fee: string | Asset;
        /**
         * Extensions. Not currently used.
         */
        extensions: any[]; // extensions_type
    };
}

export interface CommentOperation extends Operation {
    0: 'comment'; // 1
    1: {
        parent_author: string; // account_name_type
        parent_permlink: string;
        author: string; // account_name_type
        permlink: string;
        title: string;
        body: string;
        json_metadata: string;
    };
}

export interface CommentOptionsOperation extends Operation {
    0: 'comment_options'; // 19
    1: {
        author: string; // account_name_type
        permlink: string;
        /** HBD value of the maximum payout this post will receive. */
        max_accepted_payout: Asset | string;
        /** The percent of Hive Dollars to key, unkept amounts will be received as Hive Power. */
        percent_hbd: number; // uint16_t
        /** Whether to allow post to receive votes. */
        allow_votes: boolean;
        /** Whether to allow post to recieve curation rewards. */
        allow_curation_rewards: boolean;
        extensions: [0, { beneficiaries: BeneficiaryRoute[] }][]; // flat_set< comment_options_extension >
    };
}

export interface ConvertOperation extends Operation {
    0: 'convert'; // 8
    1: {
        owner: string; // account_name_type
        requestid: number; // uint32_t
        amount: Asset | string;
    };
}

export interface CreateClaimedAccountOperation extends Operation {
    0: 'create_claimed_account'; // 23
    1: {
        creator: string; // account_name_type
        new_account_name: string; // account_name_type
        owner: AuthorityType;
        active: AuthorityType;
        posting: AuthorityType;
        memo_key: string | PublicKey; // public_key_type
        json_metadata: string;
        /**
         * Extensions. Not currently used.
         */
        extensions: any[]; // extensions_type
    };
}

export interface CustomOperation extends Operation {
    0: 'custom'; // 15
    1: {
        required_auths: string[];
        id: number; // uint16
        data: Uint8Array | number[];
    };
}

export interface CustomBinaryOperation extends Operation {
    0: 'custom_binary'; // 35
    1: {
        required_owner_auths: string[]; // flat_set< account_name_type >
        required_active_auths: string[]; // flat_set< account_name_type >
        required_posting_auths: string[]; // flat_set< account_name_type >
        required_auths: AuthorityType[];
        /**
         * ID string, must be less than 32 characters long.
         */
        id: string;
        data: Uint8Array | number[];
    };
}

export interface CustomJsonOperation<ID = string, JSON = string> extends Operation {
    0: 'custom_json'; // 18
    1: {
        required_auths: string[]; // flat_set< account_name_type >
        required_posting_auths: string[]; // flat_set< account_name_type >
        /**
         * ID string, must be less than 32 characters long.
         */
        id: ID;
        /**
         * JSON encoded string, must be valid JSON.
         */
        json: JSON;
    };
}

export interface DeclineVotingRightsOperation extends Operation {
    0: 'decline_voting_rights'; // 36
    1: {
        account: string; // account_name_type
        decline: boolean;
    };
}

export interface DelegateVestingSharesOperation extends Operation {
    0: 'delegate_vesting_shares'; // 40
    1: {
        /**
         * The account delegating vesting shares.
         */
        delegator: string; // account_name_type
        /**
         * The account receiving vesting shares.
         */
        delegatee: string; // account_name_type
        /**
         * The amount of vesting shares delegated.
         */
        vesting_shares: string | Asset;
    };
}

export interface DeleteCommentOperation extends Operation {
    0: 'delete_comment'; // 17
    1: {
        author: string; // account_name_type
        permlink: string;
    };
}

/**
 * The agent and to accounts must approve an escrow transaction for it to be valid on
 * the blockchain. Once a part approves the escrow, the cannot revoke their approval.
 * Subsequent escrow approve operations, regardless of the approval, will be rejected.
 */
export interface EscrowApproveOperation extends Operation {
    0: 'escrow_approve'; // 31
    1: {
        from: string; // account_name_type
        to: string; // account_name_type
        agent: string; // account_name_type
        /**
         * Either to or agent.
         */
        who: string; // account_name_type
        escrow_id: number; // uint32_t
        approve: boolean;
    };
}

/**
 * If either the sender or receiver of an escrow payment has an issue, they can
 * raise it for dispute. Once a payment is in dispute, the agent has authority over
 * who gets what.
 */
export interface EscrowDisputeOperation extends Operation {
    0: 'escrow_dispute'; // 28
    1: {
        from: string; // account_name_type
        to: string; // account_name_type
        agent: string; // account_name_type
        who: string; // account_name_type
        escrow_id: number; // uint32_t
    };
}

/**
 * This operation can be used by anyone associated with the escrow transfer to
 * release funds if they have permission.
 *
 * The permission scheme is as follows:
 * If there is no dispute and escrow has not expired, either party can release funds to the other.
 * If escrow expires and there is no dispute, either party can release funds to either party.
 * If there is a dispute regardless of expiration, the agent can release funds to either party
 *    following whichever agreement was in place between the parties.
 */
export interface EscrowReleaseOperation extends Operation {
    0: 'escrow_release'; // 29
    1: {
        from: string; // account_name_type
        /**
         * The original 'to'.
         */
        to: string; // account_name_type
        agent: string; // account_name_type
        /**
         * The account that is attempting to release the funds, determines valid 'receiver'.
         */
        who: string; // account_name_type
        /**
         * The account that should receive funds (might be from, might be to).
         */
        receiver: string; // account_name_type
        escrow_id: number; // uint32_t
        /**
         * The amount of hbd to release.
         */
        hbd_amount: Asset | string;
        /**
         * The amount of hive to release.
         */
        hive_amount: Asset | string;
    };
}

/**
 * The purpose of this operation is to enable someone to send money contingently to
 * another individual. The funds leave the *from* account and go into a temporary balance
 * where they are held until *from* releases it to *to* or *to* refunds it to *from*.
 *
 * In the event of a dispute the *agent* can divide the funds between the to/from account.
 * Disputes can be raised any time before or on the dispute deadline time, after the escrow
 * has been approved by all parties.
 *
 * This operation only creates a proposed escrow transfer. Both the *agent* and *to* must
 * agree to the terms of the arrangement by approving the escrow.
 *
 * The escrow agent is paid the fee on approval of all parties. It is up to the escrow agent
 * to determine the fee.
 *
 * Escrow transactions are uniquely identified by 'from' and 'escrow_id', the 'escrow_id' is defined
 * by the sender.
 */
export interface EscrowTransferOperation extends Operation {
    0: 'escrow_transfer'; // 27
    1: {
        from: string; // account_name_type
        to: string; // account_name_type
        agent: string; // account_name_type
        escrow_id: number; // uint32_t
        hbd_amount: Asset | string;
        hive_amount: Asset | string;
        fee: Asset | string;
        ratification_deadline: string; // time_point_sec
        escrow_expiration: string; // time_point_sec
        json_meta: string;
    };
}

export interface FeedPublishOperation extends Operation {
    0: 'feed_publish'; // 7
    1: {
        publisher: string; // account_name_type
        exchange_rate: PriceType;
    };
}

/**
 * Cancels an order and returns the balance to owner.
 */
export interface LimitOrderCancelOperation extends Operation {
    0: 'limit_order_cancel'; // 6
    1: {
        owner: string; // account_name_type
        orderid: number; // uint32_t
    };
}

/**
 * This operation creates a limit order and matches it against existing open orders.
 */
export interface LimitOrderCreateOperation extends Operation {
    0: 'limit_order_create'; // 5
    1: {
        owner: string; // account_name_type
        orderid: number; // uint32_t
        amount_to_sell: Asset | string;
        min_to_receive: Asset | string;
        fill_or_kill: boolean;
        expiration: string; // time_point_sec
    };
}

/**
 * This operation is identical to limit_order_create except it serializes the price rather
 * than calculating it from other fields.
 */
export interface LimitOrderCreate2Operation extends Operation {
    0: 'limit_order_create2'; // 21
    1: {
        owner: string; // account_name_type
        orderid: number; // uint32_t
        amount_to_sell: Asset | string;
        exchange_rate: PriceType;
        fill_or_kill: boolean;
        expiration: string; // time_point_sec
    };
}

/**
 * Legacy proof of work operation.
 */
export interface PowOperation extends Operation {
    0: 'pow'; // 14
    1: {
        worker_account: string; // account_name_type
        block_id: any;
        nonce: number; // uint64_t
        work: any;
        props: any;
    };
}

/**
 * Legacy equihash proof of work operation.
 */
export interface Pow2Operation extends Operation {
    0: 'pow2'; // 30
    1: {
        work: any;
        new_owner_key?: string | PublicKey; // public_key_type
        props: any;
    };
}

/**
 * Recover an account to a new authority using a previous authority and verification
 * of the recovery account as proof of identity. This operation can only succeed
 * if there was a recovery request sent by the account's recover account.
 *
 * In order to recover the account, the account holder must provide proof
 * of past ownership and proof of identity to the recovery account. Being able
 * to satisfy an owner authority that was used in the past 30 days is sufficient
 * to prove past ownership. The get_owner_history function in the database API
 * returns past owner authorities that are valid for account recovery.
 *
 * Proving identity is an off chain contract between the account holder and
 * the recovery account. The recovery request contains a new authority which
 * must be satisfied by the account holder to regain control. The actual process
 * of verifying authority may become complicated, but that is an application
 * level concern, not a blockchain concern.
 *
 * This operation requires both the past and future owner authorities in the
 * operation because neither of them can be derived from the current chain state.
 * The operation must be signed by keys that satisfy both the new owner authority
 * and the recent owner authority. Failing either fails the operation entirely.
 *
 * If a recovery request was made inadvertantly, the account holder should
 * contact the recovery account to have the request deleted.
 *
 * The two setp combination of the account recovery request and recover is
 * safe because the recovery account never has access to secrets of the account
 * to recover. They simply act as an on chain endorsement of off chain identity.
 * In other systems, a fork would be required to enforce such off chain state.
 * Additionally, an account cannot be permanently recovered to the wrong account.
 * While any owner authority from the past 30 days can be used, including a compromised
 * authority, the account can be continually recovered until the recovery account
 * is confident a combination of uncompromised authorities were used to
 * recover the account. The actual process of verifying authority may become
 * complicated, but that is an application level concern, not the blockchain's
 * concern.
 */
export interface RecoverAccountOperation extends Operation {
    0: 'recover_account'; // 25
    1: {
        /**
         * The account to be recovered.
         */
        account_to_recover: string; // account_name_type
        /**
         * The new owner authority as specified in the request account recovery operation.
         */
        new_owner_authority: AuthorityType;
        /**
         * A previous owner authority that the account holder will use to prove
         * past ownership of the account to be recovered.
         */
        recent_owner_authority: AuthorityType;
        /**
         * Extensions. Not currently used.
         */
        extensions: any[]; // extensions_type
    };
}

/**
 * This operation is used to report a miner who signs two blocks
 * at the same time. To be valid, the violation must be reported within
 * MAX_WITNESSES blocks of the head block (1 round) and the
 * producer must be in the ACTIVE witness set.
 *
 * Users not in the ACTIVE witness set should not have to worry about their
 * key getting compromised and being used to produced multiple blocks so
 * the attacker can report it and steel their vesting hive.
 *
 * The result of the operation is to transfer the full VESTING HIVE balance
 * of the block producer to the reporter.
 */
export interface ReportOverProductionOperation extends Operation {
    0: 'report_over_production'; // 16
    1: {
        reporter: string; // account_name_type
        first_block: SignedBlockHeader;
        second_block: SignedBlockHeader;
    };
}

/**
 * All account recovery requests come from a listed recovery account. This
 * is secure based on the assumption that only a trusted account should be
 * a recovery account. It is the responsibility of the recovery account to
 * verify the identity of the account holder of the account to recover by
 * whichever means they have agreed upon. The blockchain assumes identity
 * has been verified when this operation is broadcast.
 *
 * This operation creates an account recovery request which the account to
 * recover has 24 hours to respond to before the request expires and is
 * invalidated.
 *
 * There can only be one active recovery request per account at any one time.
 * Pushing this operation for an account to recover when it already has
 * an active request will either update the request to a new new owner authority
 * and extend the request expiration to 24 hours from the current head block
 * time or it will delete the request. To cancel a request, simply set the
 * weight threshold of the new owner authority to 0, making it an open authority.
 *
 * Additionally, the new owner authority must be satisfiable. In other words,
 * the sum of the key weights must be greater than or equal to the weight
 * threshold.
 *
 * This operation only needs to be signed by the the recovery account.
 * The account to recover confirms its identity to the blockchain in
 * the recover account operation.
 */
export interface RequestAccountRecoveryOperation extends Operation {
    0: 'request_account_recovery'; // 24
    1: {
        /**
         * The recovery account is listed as the recovery account on the account to recover.
         */
        recovery_account: string; // account_name_type
        /**
         * The account to recover. This is likely due to a compromised owner authority.
         */
        account_to_recover: string; // account_name_type
        /**
         * The new owner authority the account to recover wishes to have. This is secret
         * known by the account to recover and will be confirmed in a recover_account_operation.
         */
        new_owner_authority: AuthorityType;
        /**
         * Extensions. Not currently used.
         */
        extensions: any[]; // extensions_type
    };
}

/**
 * This operation allows recovery_account to change account_to_reset's owner authority to
 * new_owner_authority after 60 days of inactivity.
 */
export interface ResetAccountOperation extends Operation {
    0: 'reset_account'; // 37
    1: {
        reset_account: string; // account_name_type
        account_to_reset: string; // account_name_type
        new_owner_authority: AuthorityType;
    };
}

/**
 * This operation allows 'account' owner to control which account has the power
 * to execute the 'reset_account_operation' after 60 days.
 */
export interface SetResetAccountOperation extends Operation {
    0: 'set_reset_account'; // 38
    1: {
        account: string; // account_name_type
        current_reset_account: string; // account_name_type
        reset_account: string; // account_name_type
    };
}

/**
 * Allows an account to setup a vesting withdraw but with the additional
 * request for the funds to be transferred directly to another account's
 * balance rather than the withdrawing account. In addition, those funds
 * can be immediately vested again, circumventing the conversion from
 * vests to hive and back, guaranteeing they maintain their value.
 */
export interface SetWithdrawVestingRouteOperation extends Operation {
    0: 'set_withdraw_vesting_route'; // 20
    1: {
        from_account: string; // account_name_type
        to_account: string; // account_name_type
        percent: number; // uint16_t (100% = 100_PERCENT = 10000)
        auto_vest: boolean;
    };
}

/**
 * Transfers asset from one account to another.
 */
export interface TransferOperation extends Operation {
    0: 'transfer'; // 2
    1: {
        /**
         * Sending account name.
         */
        from: string; // account_name_type
        /**
         * Receiving account name.
         */
        to: string; // account_name_type
        /**
         * Amount of HIVE or HBD to send.
         */
        amount: string | Asset;
        /**
         * Plain-text note attached to transaction.
         */
        memo: string;
    };
}

export interface TransferFromSavingsOperation extends Operation {
    0: 'transfer_from_savings'; // 33
    1: {
        from: string; // account_name_type
        request_id: number; // uint32_t
        to: string; // account_name_type
        amount: string | Asset;
        memo: string;
    };
}

export interface TransferToSavingsOperation extends Operation {
    0: 'transfer_to_savings'; // 32
    1: {
        amount: string | Asset;
        from: string; // account_name_type
        memo: string;
        request_id: number; // uint32_t
        to: string; // account_name_type
    };
}

/**
 * This operation converts HIVE into VFS (Vesting Fund Shares) at
 * the current exchange rate. With this operation it is possible to
 * give another account vesting shares so that faucets can
 * pre-fund new accounts with vesting shares.
 * (A.k.a. Powering Up)
 */
export interface TransferToVestingOperation extends Operation {
    0: 'transfer_to_vesting'; // 3
    1: {
        from: string; // account_name_type
        to: string; // account_name_type
        /**
         * Amount to power up, must be HIVE
         */
        amount: string | Asset;
    };
}

export interface VoteOperation extends Operation {
    0: 'vote'; // 0
    1: {
        voter: string; // account_name_type
        author: string; // account_name_type
        permlink: string;
        /**
         * Voting weight, 100% = 10000 (100_PERCENT).
         */
        weight: number; // int16_t
    };
}

/**
 * At any given point in time an account can be withdrawing from their
 * vesting shares. A user may change the number of shares they wish to
 * cash out at any time between 0 and their total vesting stake.
 *
 * After applying this operation, vesting_shares will be withdrawn
 * at a rate of vesting_shares/104 per week for two years starting
 * one week after this operation is included in the blockchain.
 *
 * This operation is not valid if the user has no vesting shares.
 * (A.k.a. Powering Down)
 */
export interface WithdrawVestingOperation extends Operation {
    0: 'withdraw_vesting'; // 4
    1: {
        account: string; // account_name_type
        /**
         * Amount to power down, must be VESTS.
         */
        vesting_shares: string | Asset;
    };
}

/**
 * Users who wish to become a witness must pay a fee acceptable to
 * the current witnesses to apply for the position and allow voting
 * to begin.
 *
 * If the owner isn't a witness they will become a witness.  Witnesses
 * are charged a fee equal to 1 weeks worth of witness pay which in
 * turn is derived from the current share supply.  The fee is
 * only applied if the owner is not already a witness.
 *
 * If the block_signing_key is null then the witness is removed from
 * contention.  The network will pick the top 21 witnesses for
 * producing blocks.
 */
export interface WitnessUpdateOperation extends Operation {
    0: 'witness_update'; // 11
    1: {
        owner: string; // account_name_type
        /**
         * URL for witness, usually a link to a post in the witness-category tag.
         */
        url: string;
        block_signing_key: string | PublicKey | null; // public_key_type
        props: ChainProperties;
        /**
         * The fee paid to register a new witness, should be 10x current block production pay.
         */
        fee: string | Asset;
    };
}

export interface WitnessSetPropertiesOperation extends Operation {
    0: 'witness_set_properties'; // 42
    1: {
        owner: string;
        props: [string, string][];
        extensions: any[];
    };
}

export interface AccountUpdate2Operation extends Operation {
    0: 'account_update2'; // 43
    1: {
        account: string; // account_name_type
        owner?: AuthorityType; // optional< authority >
        active?: AuthorityType; // optional< authority >
        posting?: AuthorityType; // optional< authority >
        memo_key?: string | PublicKey; // public_key_type
        json_metadata: string;
        posting_json_metadata: string;
        extensions: any[];
    };
}

export interface CreateProposalOperation extends Operation {
    0: 'create_proposal'; // 44
    1: {
        creator: string;
        receiver: string;
        start_date: string; // time_point_sec
        end_date: string; // time_point_sec
        daily_pay: Asset | string;
        subject: string;
        permlink: string;
        extensions: any[];
    };
}

export interface UpdateProposalVotesOperation extends Operation {
    0: 'update_proposal_votes'; // 45
    1: {
        voter: string;
        proposal_ids: number[]; // flat_set_ex<int64_t>
        approve: boolean;
        extensions: any[];
    };
}

export interface RemoveProposalOperation extends Operation {
    0: 'remove_proposal'; // 46
    1: {
        proposal_owner: string;
        proposal_ids: number[]; // flat_set_ex<int64_t>
        extensions: any[];
    };
}

export interface UpdateProposalOperation extends Operation {
    0: 'update_proposal'; // 47
    1: {
        proposal_id: number;
        creator: string;
        daily_pay: Asset | string;
        subject: string;
        permlink: string;
        extensions: any[];
    };
}

export interface CollateralizedConvertOperation extends Operation {
    0: 'collateralized_convert'; // 48
    1: {
        owner: string;
        requestid: number;
        amount: Asset | string;
    };
}

export interface RecurrentTransferOperation extends Operation {
    0: 'recurrent_transfer'; // 49
    1: {
        from: string;
        to: string;
        amount: Asset | string;
        memo: string;
        recurrence: number;
        executions: number;
        extensions: any[];
    };
}
