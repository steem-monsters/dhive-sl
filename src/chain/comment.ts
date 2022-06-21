/**
 * @file Post/comment types
 * @author Johan Nordberg <code@johan-nordberg.com>
 * @license BSD-3-Clause-No-Military-License
 */

import { Asset } from './asset';

export interface Comment {
    id: number; // comment_id_type
    category: string;
    parent_author: string; // account_name_type
    parent_permlink: string;
    author: string; // account_name_type
    permlink: string;
    title: string;
    body: string;
    json_metadata: string;
    last_update: string; // time_point_sec
    created: string; // time_point_sec
    active: string; // time_point_sec
    last_payout: string; // time_point_sec
    depth: number; // uint8_t
    children: number; // uint32_t
    net_rshares: string; // share_type
    abs_rshares: string; // share_type
    vote_rshares: string; // share_type
    children_abs_rshares: string; // share_type
    cashout_time: string; // time_point_sec
    max_cashout_time: string; // time_point_sec
    total_vote_weight: number; // uint64_t
    reward_weight: number; // uint16_t
    total_payout_value: Asset | string;
    curator_payout_value: Asset | string;
    author_rewards: string; // share_type
    net_votes: number; // int32_t
    root_comment: number; // comment_id_type
    max_accepted_payout: string; // asset
    percent_hbd: number; // uint16_t
    allow_replies: boolean;
    allow_votes: boolean;
    allow_curation_rewards: boolean;
    beneficiaries: BeneficiaryRoute[];
}

/**
 * Discussion a.k.a. Post.
 */
export interface Discussion extends Comment {
    url: string; // /category/@rootauthor/root_permlink#author/permlink
    root_title: string;
    pending_payout_value: Asset | string;
    total_pending_payout_value: Asset | string;
    active_votes: any[]; // vote_state[]
    replies: string[]; // / author/slug mapping
    author_reputation: number; // share_type
    promoted: Asset | string;
    body_length: string; // Bignum
    reblogged_by: any[]; // account_name_type[]
    first_reblogged_by?: any; // account_name_type
    first_reblogged_on?: any; // time_point_sec
}

export interface BeneficiaryRoute {
    account: string; // account_name_type
    weight: number; // uint16_t
}
