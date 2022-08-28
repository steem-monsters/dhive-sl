/**
 * @file Account types
 * @author Johan Nordberg <code@johan-nordberg.com>, Wolf
 * @license BSD-3-Clause-No-Military-License
 */

import { Asset } from './asset';
import { PublicKey } from './keys/keys';

export interface AuthorityType {
    weight_threshold: number; // uint32_t
    account_auths: [string, number][]; // flat_map< account_name_type, uint16_t >
    key_auths: [string | PublicKey, number][]; // flat_map< public_key_type, uint16_t >
}

export class Authority implements AuthorityType {
    public weight_threshold: number;
    public account_auths: [string, number][];
    public key_auths: [string | PublicKey, number][];

    constructor({ weight_threshold, account_auths, key_auths }: AuthorityType) {
        this.weight_threshold = weight_threshold;
        this.account_auths = account_auths;
        this.key_auths = key_auths;
    }

    /**
     * Convenience to create a new instance from PublicKey or authority object.
     */
    public static from(value: string | PublicKey | AuthorityType) {
        if (value instanceof Authority) {
            return value;
        } else if (typeof value === 'string' || value instanceof PublicKey) {
            return new Authority({
                account_auths: [],
                key_auths: [[value, 1]],
                weight_threshold: 1,
            });
        } else {
            return new Authority(value);
        }
    }
}

export interface Account {
    id: number; // account_id_type
    name: string; // account_name_type
    owner: Authority;
    active: Authority;
    posting: Authority;
    memo_key: string; // public_key_type
    json_metadata: string;
    posting_json_metadata: string;
    proxy: string; // account_name_type
    last_owner_update: string; // time_point_sec
    last_account_update: string; // time_point_sec
    created: string; // time_point_sec
    mined: boolean;
    owner_challenged: boolean;
    active_challenged: boolean;
    last_owner_proved: string; // time_point_sec
    last_active_proved: string; // time_point_sec
    recovery_account: string; // account_name_type
    reset_account: string; // account_name_type
    last_account_recovery: string; // time_point_sec
    comment_count: number; // uint32_t
    lifetime_vote_count: number; // uint32_t
    post_count: number; // uint32_t
    can_vote: boolean;
    voting_power: number; // uint16_t
    last_vote_time: string; // time_point_sec
    voting_manabar: {
        current_mana: string | number;
        last_update_time: number;
    };
    balance: string | Asset;
    savings_balance: string | Asset;
    hbd_balance: string | Asset;
    hbd_seconds: string; // uint128_t
    hbd_seconds_last_update: string; // time_point_sec
    hbd_last_interest_payment: string; // time_point_sec
    savings_hbd_balance: string | Asset; // asset
    savings_hbd_seconds: string; // uint128_t
    savings_hbd_seconds_last_update: string; // time_point_sec
    savings_hbd_last_interest_payment: string; // time_point_sec
    savings_withdraw_requests: number; // uint8_t
    reward_hbd_balance: string | Asset;
    reward_hive_balance: string | Asset;
    reward_vesting_balance: string | Asset;
    reward_vesting_hive: string | Asset;
    curation_rewards: number | string; // share_type
    posting_rewards: number | string; // share_type
    vesting_shares: string | Asset;
    delegated_vesting_shares: string | Asset;
    received_vesting_shares: string | Asset;
    vesting_withdraw_rate: string | Asset;
    next_vesting_withdrawal: string; // time_point_sec
    withdrawn: number | string; // share_type
    to_withdraw: number | string; // share_type
    withdraw_routes: number; // uint16_t
    proxied_vsf_votes: number[]; // vector< share_type >
    witnesses_voted_for: number; // uint16_t
    average_bandwidth: number | string; // share_type
    lifetime_bandwidth: number | string; // share_type
    last_bandwidth_update: string; // time_point_sec
    average_market_bandwidth: number | string; // share_type
    lifetime_market_bandwidth: number | string; // share_type
    last_market_bandwidth_update: string; // time_point_sec
    last_post: string; // time_point_sec
    last_root_post: string; // time_point_sec
    pending_claimed_accounts: number;

    // Moved from ExtendedAccount
    /**
     * Convert vesting_shares to vesting hive.
     */
    vesting_balance: string | Asset;
    reputation: string | number; // share_type
    /**
     * Transfer to/from vesting.
     */
    transfer_history: any[]; // map<uint64_t,applied_operation>
    /**
     * Limit order / cancel / fill.
     */
    market_history: any[]; // map<uint64_t,applied_operation>
    post_history: any[]; // map<uint64_t,applied_operation>
    vote_history: any[]; // map<uint64_t,applied_operation>
    other_history: any[]; // map<uint64_t,applied_operation>
    witness_votes: string[]; // set<string>
    tags_usage: string[]; // vector<pair<string,uint32_t>>
    guest_bloggers: string[]; // vector<pair<account_name_type,uint32_t>>
    open_orders?: any[]; // optional<map<uint32_t,extended_limit_order>>
    comments?: any[]; // / permlinks for this user // optional<vector<string>>
    blog?: any[]; // / blog posts for this user // optional<vector<string>>
    feed?: any[]; // / feed posts for this user // optional<vector<string>>
    recent_replies?: any[]; // / blog posts for this user // optional<vector<string>>
    recommended?: any[]; // / posts recommened for this user // optional<vector<string>>
}

export interface ValidateAccountNameSuccess {
    status: 'success';
}

export interface ValidateAccountNameError {
    status: 'error';
    code: string;
    message: string;
}

export enum ValidateAccountNameErrorReason {
    account_name_should_not_be_empty = 'account_name_should_not_be_empty',
    account_name_should_be_longer = 'account_name_should_be_longer',
    account_name_should_be_shorter = 'account_name_should_be_shorter',
    account_name_segment_should_start_with_a_letter = 'account_name_segment_should_start_with_a_letter',
    account_name_segment_should_only_have_letters_digits_or_dashes = 'account_name_segment_should_only_have_letters_digits_or_dashes',
    account_name_segment_should_only_have_one_dash_in_a_row = 'account_name_segment_should_only_have_one_dash_in_a_row',
    account_name_segment_should_end_with_a_letter_or_digit = 'account_name_segment_should_end_with_a_letter_or_digit',
    account_name_segment_should_be_longer = 'account_name_segment_should_be_longer',
}

export const validateAccountName = (value: string): ValidateAccountNameSuccess | ValidateAccountNameError => {
    const fn = () => {
        let suffix = 'Account name should ';
        if (!value) {
            return { message: suffix + 'not be empty', code: ValidateAccountNameErrorReason.account_name_should_not_be_empty };
        }
        const length = value.length;
        if (length < 3) {
            return { message: suffix + 'be longer.', code: ValidateAccountNameErrorReason.account_name_should_be_longer };
        }
        if (length > 16) {
            return { message: suffix + 'be shorter.', code: ValidateAccountNameErrorReason.account_name_should_be_shorter };
        }
        if (/\./.test(value)) {
            suffix = 'Each account segment should ';
        }
        const ref = value.split('.');
        for (let i = 0, len = ref.length; i < len; i++) {
            const label = ref[i];
            if (!/^[a-z]/.test(label)) {
                return { message: suffix + 'start with a letter.', code: ValidateAccountNameErrorReason.account_name_segment_should_start_with_a_letter };
            }
            if (!/^[a-z0-9-]*$/.test(label)) {
                return {
                    message: suffix + 'have only letters, digits, or dashes.',
                    code: ValidateAccountNameErrorReason.account_name_segment_should_only_have_letters_digits_or_dashes,
                };
            }
            if (/--/.test(label)) {
                return { message: suffix + 'have only one dash in a row.', code: ValidateAccountNameErrorReason.account_name_segment_should_only_have_one_dash_in_a_row };
            }
            if (!/[a-z0-9]$/.test(label)) {
                return { message: suffix + 'end with a letter or digit.', code: ValidateAccountNameErrorReason.account_name_segment_should_end_with_a_letter_or_digit };
            }
            if (!(label.length >= 3)) {
                return { message: suffix + 'be longer', code: ValidateAccountNameErrorReason.account_name_should_be_longer };
            }
        }
        return null;
    };
    const reason = fn();
    return reason ? { ...reason, status: 'error' } : { status: 'success' };
};
