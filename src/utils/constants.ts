import { OperationName, VirtualOperationName } from '../chain';
import { hexToBytes } from '@noble/hashes/utils';

/**
 * Main Hive network chain id.
 */
export const DEFAULT_CHAIN_ID = hexToBytes('beeab0de00000000000000000000000000000000000000000000000000000000');

/**
 * Main Hive network address prefix.
 */
export const DEFAULT_ADDRESS_PREFIX = 'STM';

export const OPERATION_IDS: Record<OperationName | VirtualOperationName, number> = {
    vote: 0,
    comment: 1,
    transfer: 2,
    transfer_to_vesting: 3,
    withdraw_vesting: 4,
    limit_order_create: 5,
    limit_order_cancel: 6,
    feed_publish: 7,
    convert: 8,
    account_create: 9,
    account_update: 10,
    witness_update: 11,
    account_witness_vote: 12,
    account_witness_proxy: 13,
    pow: 14,
    custom: 15,
    report_over_production: 16,
    delete_comment: 17,
    custom_json: 18,
    comment_options: 19,
    set_withdraw_vesting_route: 20,
    limit_order_create2: 21,
    claim_account: 22,
    create_claimed_account: 23,
    request_account_recovery: 24,
    recover_account: 25,
    change_recovery_account: 26,
    escrow_transfer: 27,
    escrow_dispute: 28,
    escrow_release: 29,
    pow2: 30,
    escrow_approve: 31,
    transfer_to_savings: 32,
    transfer_from_savings: 33,
    cancel_transfer_from_savings: 34,
    custom_binary: 35,
    decline_voting_rights: 36,
    reset_account: 37,
    set_reset_account: 38,
    claim_reward_balance: 39,
    delegate_vesting_shares: 40,
    account_create_with_delegation: 41,
    witness_set_properties: 42,
    account_update2: 43,
    create_proposal: 44,
    update_proposal_votes: 45,
    remove_proposal: 46,
    update_proposal: 47,
    collateralized_convert: 48,
    recurrent_transfer: 49,
    // virtual ops
    fill_convert_request: 50,
    author_reward: 51,
    curation_reward: 52,
    comment_reward: 53,
    liquidity_reward: 54,
    interest: 55,
    fill_vesting_withdraw: 56,
    fill_order: 57,
    shutdown_witness: 58,
    fill_transfer_from_savings: 59,
    hardfork: 60,
    comment_payout_update: 61,
    return_vesting_delegation: 62,
    comment_benefactor_reward: 63,
    producer_reward: 64,
    clear_null_account_balance: 65,
    proposal_pay: 66,
    sps_fund: 67,
    hardfork_hive: 68,
    hardfork_hive_restore: 69,
    delayed_voting: 70,
    consolidate_treasury_balance: 71,
    effective_comment_vote: 72,
    ineffective_delete_comment: 73,
    sps_convert: 74,
    expired_account_notification: 75,
    changed_recovery_account: 76,
    transfer_to_vesting_completed: 77,
    pow_reward: 78,
    vesting_shares_split: 79,
    account_created: 80,
    fill_collateralized_convert_request: 81,
    system_warning: 82,
    fill_recurrent_transfer: 83,
    failed_recurrent_transfer: 84,
};

export const OPERATION_ID_KEYS: (OperationName | VirtualOperationName)[] = [
    'vote', // 0
    'comment', // 1
    'transfer', // 2
    'transfer_to_vesting', // 3
    'withdraw_vesting', // 4
    'limit_order_create', // 5
    'limit_order_cancel', // 6
    'feed_publish', // 7
    'convert', // 8
    'account_create', // 9
    'account_update', // 10
    'witness_update', // 11
    'account_witness_vote', // 12
    'account_witness_proxy', // 13
    'pow', // 14
    'custom', // 15
    'report_over_production', // 16
    'delete_comment', // 17
    'custom_json', // 18
    'comment_options', // 19
    'set_withdraw_vesting_route', // 20
    'limit_order_create2', // 21
    'claim_account', // 22
    'create_claimed_account', // 23
    'request_account_recovery', // 24
    'recover_account', // 25
    'change_recovery_account', // 26
    'escrow_transfer', // 27
    'escrow_dispute', // 28
    'escrow_release', // 29
    'pow2', // 30
    'escrow_approve', // 31
    'transfer_to_savings', // 32
    'transfer_from_savings', // 33
    'cancel_transfer_from_savings', // 34
    'custom_binary', // 35
    'decline_voting_rights', // 36
    'reset_account', // 37
    'set_reset_account', // 38
    'claim_reward_balance', // 39
    'delegate_vesting_shares', // 40
    'account_create_with_delegation', // 41
    'witness_set_properties', // 42
    'account_update2', // 43
    'create_proposal', // 44
    'update_proposal_votes', // 45
    'remove_proposal', // 46
    'update_proposal', // 47
    'collateralized_convert', // 48
    'recurrent_transfer', // 49
    // VIRTUAL
    'fill_convert_request', // last_regular + 1
    'author_reward', // last_regular + 2
    'curation_reward', // last_regular + 3
    'comment_reward', // last_regular + 4
    'liquidity_reward', // last_regular + 5
    'interest', // last_regular + 6
    'fill_vesting_withdraw', // last_regular + 7
    'fill_order', // last_regular + 8
    'shutdown_witness', // last_regular + 9
    'fill_transfer_from_savings', // last_regular + 10
    'hardfork', // last_regular + 11
    'comment_payout_update', // last_regular + 12
    'return_vesting_delegation', // last_regular + 13
    'comment_benefactor_reward', // last_regular + 14
    'producer_reward', // last_regular + 15
    'clear_null_account_balance', // last_regular + 16
    'proposal_pay', // last_regular + 17
    'sps_fund', // last_regular + 18
    'hardfork_hive', // last_regular + 19
    'hardfork_hive_restore', // last_regular + 20
    'delayed_voting', // last_regular + 21
    'consolidate_treasury_balance', // last_regular + 22
    'effective_comment_vote', // last_regular + 23
    'ineffective_delete_comment', // last_regular + 24
    'sps_convert', // last_regular + 25
    'expired_account_notification', // last_regular + 26
    'changed_recovery_account', // last_regular + 27
    'transfer_to_vesting_completed', // last_regular + 28
    'pow_reward', // last_regular + 29
    'vesting_shares_split', // last_regular + 30
    'account_created', // last_regular + 31
    'fill_collateralized_convert_request', // last_regular + 32
    'system_warning', // last_regular + 33,
    'fill_recurrent_transfer', // last_regular + 34
    'failed_recurrent_transfer', // last_regular + 35
];
