import { Account } from '../chain/account';
import { AccountRelationship, CommunityDetail, Notifications, Post } from '../chain/hivemind';
import { ClientFetch } from '../clientFetch';

export type PostsSortOrder = 'trending' | 'hot' | 'created' | 'promoted' | 'payout' | 'payout_comments' | 'muted';

interface PostsQuery {
    /**
     * Number of posts to fetch
     */
    limit?: number;
    /**
     * Sorting posts
     */
    sort: PostsSortOrder;
    /**
     * Filtering with tags
     */
    tag?: string[] | string;
    /**
     * Observer account
     */
    observer?: string;
    /**
     * Paginating last post author
     */
    start_author?: string;
    /**
     * Paginating last post permlink
     */
    start_permlink?: string;
}

/**
 * Omitting sort extended from BridgeParam
 */
interface AccountPostsQuery extends Omit<PostsQuery, 'sort'> {
    account: string;
    sort: 'posts';
}

interface CommunityQuery {
    name: string;
    observer: string;
}

// interface CommunityRolesQuery {
//     community: string;
// }

interface AccountNotifsQuery {
    account: Account['name'];
    limit: number;
    type?: 'new_community' | 'pin_post';
}

interface ListCommunitiesQuery {
    /**
     * Paginating last
     */
    last?: string;
    /**
     * Number of communities to fetch
     */
    limit: number;
    /**
     * To be developed, not ready yet
     */
    query?: string | any;
    /**
     * Observer account
     */
    observer?: Account['name'];
}

export class HivemindAPI {
    constructor(private readonly fetch: ClientFetch) {}

    public getPost(author: string, permlink: string, observer?: string): Promise<Post> {
        return this.call('get_post', { author, permlink, observer });
    }

    public normalizePost(post: any): Promise<Post> {
        return this.call('normalize_post', { post });
    }

    /**
     * Get trending, hot, recent community posts from Hivemind
     * @param options
     */
    public getRankedPosts(options: PostsQuery): Promise<Post[]> {
        return this.call('get_ranked_posts', options);
    }

    /**
     * Get posts by particular account from Hivemind
     * @param options
     */
    public getAccountPosts(options: AccountPostsQuery): Promise<Post[]> {
        return this.call('get_account_posts', options);
    }

    /**
     * Get community details such as who are the admin,
     * moderators, how many subscribers, etc..
     * @param options
     */
    public getCommunity(options: CommunityQuery): Promise<CommunityDetail> {
        return this.call('get_community', options);
    }

    /**
     * List all subscriptions by particular account
     * @param account the account you want to query
     * @returns {Array} return role, what community the account joined
     */
    public listAllSubscriptions(account: Account['name'] | object): Promise<Post[]> {
        return this.call('list_all_subscriptions', account);
    }

    public listSubscribers(community: string): Promise<string[]> {
        return this.call('list_subscribers', { community });
    }

    /**
     * Get particular account notifications feed
     * @param options
     */
    public getAccountNotifications(options?: AccountNotifsQuery): Promise<Notifications[]> {
        return this.call('account_notifications', options);
    }

    /**
     * List all available communities on hivemind
     * @param options
     */
    public listCommunities(options: ListCommunitiesQuery): Promise<CommunityDetail[]> {
        return this.call('list_communities', options);
    }

    public getRelationshipBetweenAccounts(follower: string, following: string): Promise<AccountRelationship> {
        return this.call('get_relationship_between_accounts', [follower, following]);
    }

    /**
     * Convenience for calling `bridge` api.
     */
    public call(method: string, params?: any) {
        return this.fetch.call(`bridge.${method}`, params);
    }
}
