import { Cookie } from 'tough-cookie';
import { PollV2, TTweetv2Expansion, TTweetv2TweetField, TTweetv2PollField, TTweetv2MediaField, TTweetv2UserField, TTweetv2PlaceField } from 'twitter-api-v2';
import { EventEmitter } from 'events';

type FetchParameters = [input: RequestInfo | URL, init?: RequestInit];
interface FetchTransformOptions {
    /**
     * Transforms the request options before a request is made. This executes after all of the default
     * parameters have been configured, and is stateless. It is safe to return new request options
     * objects.
     * @param args The request options.
     * @returns The transformed request options.
     */
    request: (...args: FetchParameters) => FetchParameters | Promise<FetchParameters>;
    /**
     * Transforms the response after a request completes. This executes immediately after the request
     * completes, and is stateless. It is safe to return a new response object.
     * @param response The response object.
     * @returns The transformed response object.
     */
    response: (response: Response) => Response | Promise<Response>;
}

/**
 * A parsed profile object.
 */
interface Profile {
    avatar?: string;
    banner?: string;
    biography?: string;
    birthday?: string;
    followersCount?: number;
    followingCount?: number;
    friendsCount?: number;
    mediaCount?: number;
    statusesCount?: number;
    isPrivate?: boolean;
    isVerified?: boolean;
    isBlueVerified?: boolean;
    joined?: Date;
    likesCount?: number;
    listedCount?: number;
    location: string;
    name?: string;
    pinnedTweetIds?: string[];
    tweetsCount?: number;
    url?: string;
    userId?: string;
    username?: string;
    website?: string;
    canDm?: boolean;
}

interface Mention {
    id: string;
    username?: string;
    name?: string;
}
interface Photo {
    id: string;
    url: string;
    alt_text: string | undefined;
}
interface Video {
    id: string;
    preview: string;
    url?: string;
}
interface PlaceRaw {
    id?: string;
    place_type?: string;
    name?: string;
    full_name?: string;
    country_code?: string;
    country?: string;
    bounding_box?: {
        type?: string;
        coordinates?: number[][][];
    };
}
interface PollData {
    id?: string;
    end_datetime?: string;
    voting_status?: string;
    duration_minutes: number;
    options: PollOption[];
}
interface PollOption {
    position?: number;
    label: string;
    votes?: number;
}
/**
 * A parsed Tweet object.
 */
interface Tweet {
    bookmarkCount?: number;
    conversationId?: string;
    hashtags: string[];
    html?: string;
    id?: string;
    inReplyToStatus?: Tweet;
    inReplyToStatusId?: string;
    isQuoted?: boolean;
    isPin?: boolean;
    isReply?: boolean;
    isRetweet?: boolean;
    isSelfThread?: boolean;
    likes?: number;
    name?: string;
    mentions: Mention[];
    permanentUrl?: string;
    photos: Photo[];
    place?: PlaceRaw;
    quotedStatus?: Tweet;
    quotedStatusId?: string;
    replies?: number;
    retweets?: number;
    retweetedStatus?: Tweet;
    retweetedStatusId?: string;
    text?: string;
    thread: Tweet[];
    timeParsed?: Date;
    timestamp?: number;
    urls: string[];
    userId?: string;
    username?: string;
    videos: Video[];
    views?: number;
    sensitiveContent?: boolean;
    poll?: PollV2 | null;
}
type TweetQuery = Partial<Tweet> | ((tweet: Tweet) => boolean | Promise<boolean>);

/**
 * A paginated tweets API response. The `next` field can be used to fetch the next page of results,
 * and the `previous` can be used to fetch the previous results (or results created after the
 * inital request)
 */
interface QueryTweetsResponse {
    tweets: Tweet[];
    next?: string;
    previous?: string;
}
/**
 * A paginated profiles API response. The `next` field can be used to fetch the next page of results.
 */
interface QueryProfilesResponse {
    profiles: Profile[];
    next?: string;
    previous?: string;
}

/**
 * The categories that can be used in Twitter searches.
 */
declare enum SearchMode {
    Top = 0,
    Latest = 1,
    Photos = 2,
    Videos = 3,
    Users = 4
}

interface DirectMessage {
    id: string;
    text: string;
    senderId: string;
    recipientId: string;
    createdAt: string;
    mediaUrls?: string[];
    senderScreenName?: string;
    recipientScreenName?: string;
}
interface DirectMessageConversation {
    conversationId: string;
    messages: DirectMessage[];
    participants: {
        id: string;
        screenName: string;
    }[];
}
interface DirectMessagesResponse {
    conversations: DirectMessageConversation[];
    users: TwitterUser[];
    cursor?: string;
    lastSeenEventId?: string;
    trustedLastSeenEventId?: string;
    untrustedLastSeenEventId?: string;
    inboxTimelines?: {
        trusted?: {
            status: string;
            minEntryId?: string;
        };
        untrusted?: {
            status: string;
            minEntryId?: string;
        };
    };
    userId: string;
}
interface TwitterUser {
    id: string;
    screenName: string;
    name: string;
    profileImageUrl: string;
    description?: string;
    verified?: boolean;
    protected?: boolean;
    followersCount?: number;
    friendsCount?: number;
}
interface SendDirectMessageResponse {
    entries: {
        message: {
            id: string;
            time: string;
            affects_sort: boolean;
            conversation_id: string;
            message_data: {
                id: string;
                time: string;
                recipient_id: string;
                sender_id: string;
                text: string;
            };
        };
    }[];
    users: Record<string, TwitterUser>;
}

/**
 * Represents a Community that can host Spaces.
 */
interface Community {
    id: string;
    name: string;
    rest_id: string;
}
/**
 * Represents the response structure for the CommunitySelectQuery.
 */
interface CommunitySelectQueryResponse {
    data: {
        space_hostable_communities: Community[];
    };
    errors?: any[];
}
/**
 * Represents a Subtopic within a Category.
 */
interface Subtopic {
    icon_url: string;
    name: string;
    topic_id: string;
}
/**
 * Represents a Category containing multiple Subtopics.
 */
interface Category {
    icon: string;
    name: string;
    semantic_core_entity_id: string;
    subtopics: Subtopic[];
}
/**
 * Represents the data structure for BrowseSpaceTopics.
 */
interface BrowseSpaceTopics {
    categories: Category[];
}
/**
 * Represents the response structure for the BrowseSpaceTopics query.
 */
interface BrowseSpaceTopicsResponse {
    data: {
        browse_space_topics: BrowseSpaceTopics;
    };
    errors?: any[];
}
/**
 * Represents the result details of a Creator.
 */
interface CreatorResult {
    __typename: string;
    id: string;
    rest_id: string;
    affiliates_highlighted_label: Record<string, any>;
    has_graduated_access: boolean;
    is_blue_verified: boolean;
    profile_image_shape: string;
    legacy: {
        following: boolean;
        can_dm: boolean;
        can_media_tag: boolean;
        created_at: string;
        default_profile: boolean;
        default_profile_image: boolean;
        description: string;
        entities: {
            description: {
                urls: any[];
            };
        };
        fast_followers_count: number;
        favourites_count: number;
        followers_count: number;
        friends_count: number;
        has_custom_timelines: boolean;
        is_translator: boolean;
        listed_count: number;
        location: string;
        media_count: number;
        name: string;
        needs_phone_verification: boolean;
        normal_followers_count: number;
        pinned_tweet_ids_str: string[];
        possibly_sensitive: boolean;
        profile_image_url_https: string;
        profile_interstitial_type: string;
        screen_name: string;
        statuses_count: number;
        translator_type: string;
        verified: boolean;
        want_retweets: boolean;
        withheld_in_countries: string[];
    };
    tipjar_settings: Record<string, any>;
}
/**
 * Represents user results within an Admin.
 */
interface UserResults {
    rest_id: string;
    result: {
        __typename: string;
        identity_profile_labels_highlighted_label: Record<string, any>;
        is_blue_verified: boolean;
        legacy: Record<string, any>;
    };
}
/**
 * Represents an Admin participant in an Audio Space.
 */
interface Admin {
    periscope_user_id: string;
    start: number;
    twitter_screen_name: string;
    display_name: string;
    avatar_url: string;
    is_verified: boolean;
    is_muted_by_admin: boolean;
    is_muted_by_guest: boolean;
    user_results: UserResults;
}
/**
 * Represents Participants in an Audio Space.
 */
interface Participants {
    total: number;
    admins: Admin[];
    speakers: any[];
    listeners: any[];
}
/**
 * Represents Metadata of an Audio Space.
 */
interface Metadata {
    rest_id: string;
    state: string;
    media_key: string;
    created_at: number;
    started_at: number;
    ended_at: string;
    updated_at: number;
    content_type: string;
    creator_results: {
        result: CreatorResult;
    };
    conversation_controls: number;
    disallow_join: boolean;
    is_employee_only: boolean;
    is_locked: boolean;
    is_muted: boolean;
    is_space_available_for_clipping: boolean;
    is_space_available_for_replay: boolean;
    narrow_cast_space_type: number;
    no_incognito: boolean;
    total_replay_watched: number;
    total_live_listeners: number;
    tweet_results: Record<string, any>;
    max_guest_sessions: number;
    max_admin_capacity: number;
}
/**
 * Represents Sharings within an Audio Space.
 */
interface Sharings {
    items: any[];
    slice_info: Record<string, any>;
}
/**
 * Represents an Audio Space.
 */
interface AudioSpace {
    metadata: Metadata;
    is_subscribed: boolean;
    participants: Participants;
    sharings: Sharings;
}
/**
 * Represents the response structure for the AudioSpaceById query.
 */
interface AudioSpaceByIdResponse {
    data: {
        audioSpace: AudioSpace;
    };
    errors?: any[];
}
/**
 * Represents the variables required for the AudioSpaceById query.
 */
interface AudioSpaceByIdVariables {
    id: string;
    isMetatagsQuery: boolean;
    withReplays: boolean;
    withListeners: boolean;
}
interface LiveVideoSource {
    location: string;
    noRedirectPlaybackUrl: string;
    status: string;
    streamType: string;
}
interface LiveVideoStreamStatus {
    source: LiveVideoSource;
    sessionId: string;
    chatToken: string;
    lifecycleToken: string;
    shareUrl: string;
    chatPermissionType: string;
}
interface AuthenticatePeriscopeResponse {
    data: {
        authenticate_periscope: string;
    };
    errors?: any[];
}
interface LoginTwitterTokenResponse {
    cookie: string;
    user: {
        class_name: string;
        id: string;
        created_at: string;
        is_beta_user: boolean;
        is_employee: boolean;
        is_twitter_verified: boolean;
        verified_type: number;
        is_bluebird_user: boolean;
        twitter_screen_name: string;
        username: string;
        display_name: string;
        description: string;
        profile_image_urls: {
            url: string;
            ssl_url: string;
            width: number;
            height: number;
        }[];
        twitter_id: string;
        initials: string;
        n_followers: number;
        n_following: number;
    };
    type: string;
}

interface ScraperOptions {
    /**
     * An alternative fetch function to use instead of the default fetch function. This may be useful
     * in nonstandard runtime environments, such as edge workers.
     */
    fetch: typeof fetch;
    /**
     * Additional options that control how requests and responses are processed. This can be used to
     * proxy requests through other hosts, for example.
     */
    transform: Partial<FetchTransformOptions>;
}
/**
 * An interface to Twitter's undocumented API.
 * - Reusing Scraper objects is recommended to minimize the time spent authenticating unnecessarily.
 */
declare class Scraper {
    private readonly options?;
    private auth;
    private authTrends;
    private token;
    /**
     * Creates a new Scraper object.
     * - Scrapers maintain their own guest tokens for Twitter's internal API.
     * - Reusing Scraper objects is recommended to minimize the time spent authenticating unnecessarily.
     */
    constructor(options?: Partial<ScraperOptions> | undefined);
    /**
     * Fetches a Twitter profile.
     * @param username The Twitter username of the profile to fetch, without an `@` at the beginning.
     * @returns The requested {@link Profile}.
     */
    getProfile(username: string): Promise<Profile>;
    /**
     * Fetches the user ID corresponding to the provided screen name.
     * @param screenName The Twitter screen name of the profile to fetch.
     * @returns The ID of the corresponding account.
     */
    getUserIdByScreenName(screenName: string): Promise<string>;
    /**
     *
     * @param userId The user ID of the profile to fetch.
     * @returns The screen name of the corresponding account.
     */
    getScreenNameByUserId(userId: string): Promise<string>;
    /**
     * Fetches tweets from Twitter.
     * @param query The search query. Any Twitter-compatible query format can be used.
     * @param maxTweets The maximum number of tweets to return.
     * @param includeReplies Whether or not replies should be included in the response.
     * @param searchMode The category filter to apply to the search. Defaults to `Top`.
     * @returns An {@link AsyncGenerator} of tweets matching the provided filters.
     */
    searchTweets(query: string, maxTweets: number, searchMode?: SearchMode): AsyncGenerator<Tweet, void>;
    /**
     * Fetches profiles from Twitter.
     * @param query The search query. Any Twitter-compatible query format can be used.
     * @param maxProfiles The maximum number of profiles to return.
     * @returns An {@link AsyncGenerator} of tweets matching the provided filter(s).
     */
    searchProfiles(query: string, maxProfiles: number): AsyncGenerator<Profile, void>;
    /**
     * Fetches tweets from Twitter.
     * @param query The search query. Any Twitter-compatible query format can be used.
     * @param maxTweets The maximum number of tweets to return.
     * @param includeReplies Whether or not replies should be included in the response.
     * @param searchMode The category filter to apply to the search. Defaults to `Top`.
     * @param cursor The search cursor, which can be passed into further requests for more results.
     * @returns A page of results, containing a cursor that can be used in further requests.
     */
    fetchSearchTweets(query: string, maxTweets: number, searchMode: SearchMode, cursor?: string): Promise<QueryTweetsResponse>;
    /**
     * Fetches profiles from Twitter.
     * @param query The search query. Any Twitter-compatible query format can be used.
     * @param maxProfiles The maximum number of profiles to return.
     * @param cursor The search cursor, which can be passed into further requests for more results.
     * @returns A page of results, containing a cursor that can be used in further requests.
     */
    fetchSearchProfiles(query: string, maxProfiles: number, cursor?: string): Promise<QueryProfilesResponse>;
    /**
     * Fetches list tweets from Twitter.
     * @param listId The list id
     * @param maxTweets The maximum number of tweets to return.
     * @param cursor The search cursor, which can be passed into further requests for more results.
     * @returns A page of results, containing a cursor that can be used in further requests.
     */
    fetchListTweets(listId: string, maxTweets: number, cursor?: string): Promise<QueryTweetsResponse>;
    /**
     * Fetch the profiles a user is following
     * @param userId The user whose following should be returned
     * @param maxProfiles The maximum number of profiles to return.
     * @returns An {@link AsyncGenerator} of following profiles for the provided user.
     */
    getFollowing(userId: string, maxProfiles: number): AsyncGenerator<Profile, void>;
    /**
     * Fetch the profiles that follow a user
     * @param userId The user whose followers should be returned
     * @param maxProfiles The maximum number of profiles to return.
     * @returns An {@link AsyncGenerator} of profiles following the provided user.
     */
    getFollowers(userId: string, maxProfiles: number): AsyncGenerator<Profile, void>;
    /**
     * Fetches following profiles from Twitter.
     * @param userId The user whose following should be returned
     * @param maxProfiles The maximum number of profiles to return.
     * @param cursor The search cursor, which can be passed into further requests for more results.
     * @returns A page of results, containing a cursor that can be used in further requests.
     */
    fetchProfileFollowing(userId: string, maxProfiles: number, cursor?: string): Promise<QueryProfilesResponse>;
    /**
     * Fetches profile followers from Twitter.
     * @param userId The user whose following should be returned
     * @param maxProfiles The maximum number of profiles to return.
     * @param cursor The search cursor, which can be passed into further requests for more results.
     * @returns A page of results, containing a cursor that can be used in further requests.
     */
    fetchProfileFollowers(userId: string, maxProfiles: number, cursor?: string): Promise<QueryProfilesResponse>;
    /**
     * Fetches the home timeline for the current user. (for you feed)
     * @param count The number of tweets to fetch.
     * @param seenTweetIds An array of tweet IDs that have already been seen.
     * @returns A promise that resolves to the home timeline response.
     */
    fetchHomeTimeline(count: number, seenTweetIds: string[]): Promise<any[]>;
    /**
     * Fetches the home timeline for the current user. (following feed)
     * @param count The number of tweets to fetch.
     * @param seenTweetIds An array of tweet IDs that have already been seen.
     * @returns A promise that resolves to the home timeline response.
     */
    fetchFollowingTimeline(count: number, seenTweetIds: string[]): Promise<any[]>;
    getUserTweets(userId: string, maxTweets?: number, cursor?: string): Promise<{
        tweets: Tweet[];
        next?: string;
    }>;
    getUserTweetsIterator(userId: string, maxTweets?: number): AsyncGenerator<Tweet, void>;
    /**
     * Fetches the current trends from Twitter.
     * @returns The current list of trends.
     */
    getTrends(): Promise<string[]>;
    /**
     * Fetches tweets from a Twitter user.
     * @param user The user whose tweets should be returned.
     * @param maxTweets The maximum number of tweets to return. Defaults to `200`.
     * @returns An {@link AsyncGenerator} of tweets from the provided user.
     */
    getTweets(user: string, maxTweets?: number): AsyncGenerator<Tweet>;
    /**
     * Fetches tweets from a Twitter user using their ID.
     * @param userId The user whose tweets should be returned.
     * @param maxTweets The maximum number of tweets to return. Defaults to `200`.
     * @returns An {@link AsyncGenerator} of tweets from the provided user.
     */
    getTweetsByUserId(userId: string, maxTweets?: number): AsyncGenerator<Tweet, void>;
    /**
     * Send a tweet
     * @param text The text of the tweet
     * @param tweetId The id of the tweet to reply to
     * @param mediaData Optional media data
     * @returns
     */
    sendTweet(text: string, replyToTweetId?: string, mediaData?: {
        data: Buffer;
        mediaType: string;
    }[]): Promise<Response>;
    sendNoteTweet(text: string, replyToTweetId?: string, mediaData?: {
        data: Buffer;
        mediaType: string;
    }[]): Promise<any>;
    /**
     * Send a long tweet (Note Tweet)
     * @param text The text of the tweet
     * @param tweetId The id of the tweet to reply to
     * @param mediaData Optional media data
     * @returns
     */
    sendLongTweet(text: string, replyToTweetId?: string, mediaData?: {
        data: Buffer;
        mediaType: string;
    }[]): Promise<Response>;
    /**
     * Send a tweet
     * @param text The text of the tweet
     * @param tweetId The id of the tweet to reply to
     * @param options The options for the tweet
     * @returns
     */
    sendTweetV2(text: string, replyToTweetId?: string, options?: {
        poll?: PollData;
    }): Promise<Tweet | null>;
    /**
     * Fetches tweets and replies from a Twitter user.
     * @param user The user whose tweets should be returned.
     * @param maxTweets The maximum number of tweets to return. Defaults to `200`.
     * @returns An {@link AsyncGenerator} of tweets from the provided user.
     */
    getTweetsAndReplies(user: string, maxTweets?: number): AsyncGenerator<Tweet>;
    /**
     * Fetches tweets and replies from a Twitter user using their ID.
     * @param userId The user whose tweets should be returned.
     * @param maxTweets The maximum number of tweets to return. Defaults to `200`.
     * @returns An {@link AsyncGenerator} of tweets from the provided user.
     */
    getTweetsAndRepliesByUserId(userId: string, maxTweets?: number): AsyncGenerator<Tweet, void>;
    /**
     * Fetches the first tweet matching the given query.
     *
     * Example:
     * ```js
     * const timeline = scraper.getTweets('user', 200);
     * const retweet = await scraper.getTweetWhere(timeline, { isRetweet: true });
     * ```
     * @param tweets The {@link AsyncIterable} of tweets to search through.
     * @param query A query to test **all** tweets against. This may be either an
     * object of key/value pairs or a predicate. If this query is an object, all
     * key/value pairs must match a {@link Tweet} for it to be returned. If this query
     * is a predicate, it must resolve to `true` for a {@link Tweet} to be returned.
     * - All keys are optional.
     * - If specified, the key must be implemented by that of {@link Tweet}.
     */
    getTweetWhere(tweets: AsyncIterable<Tweet>, query: TweetQuery): Promise<Tweet | null>;
    /**
     * Fetches all tweets matching the given query.
     *
     * Example:
     * ```js
     * const timeline = scraper.getTweets('user', 200);
     * const retweets = await scraper.getTweetsWhere(timeline, { isRetweet: true });
     * ```
     * @param tweets The {@link AsyncIterable} of tweets to search through.
     * @param query A query to test **all** tweets against. This may be either an
     * object of key/value pairs or a predicate. If this query is an object, all
     * key/value pairs must match a {@link Tweet} for it to be returned. If this query
     * is a predicate, it must resolve to `true` for a {@link Tweet} to be returned.
     * - All keys are optional.
     * - If specified, the key must be implemented by that of {@link Tweet}.
     */
    getTweetsWhere(tweets: AsyncIterable<Tweet>, query: TweetQuery): Promise<Tweet[]>;
    /**
     * Fetches the most recent tweet from a Twitter user.
     * @param user The user whose latest tweet should be returned.
     * @param includeRetweets Whether or not to include retweets. Defaults to `false`.
     * @returns The {@link Tweet} object or `null`/`undefined` if it couldn't be fetched.
     */
    getLatestTweet(user: string, includeRetweets?: boolean, max?: number): Promise<Tweet | null | void>;
    /**
     * Fetches a single tweet.
     * @param id The ID of the tweet to fetch.
     * @returns The {@link Tweet} object, or `null` if it couldn't be fetched.
     */
    getTweet(id: string): Promise<Tweet | null>;
    /**
     * Fetches a single tweet by ID using the Twitter API v2.
     * Allows specifying optional expansions and fields for more detailed data.
     *
     * @param {string} id - The ID of the tweet to fetch.
     * @param {Object} [options] - Optional parameters to customize the tweet data.
     * @param {string[]} [options.expansions] - Array of expansions to include, e.g., 'attachments.poll_ids'.
     * @param {string[]} [options.tweetFields] - Array of tweet fields to include, e.g., 'created_at', 'public_metrics'.
     * @param {string[]} [options.pollFields] - Array of poll fields to include, if the tweet has a poll, e.g., 'options', 'end_datetime'.
     * @param {string[]} [options.mediaFields] - Array of media fields to include, if the tweet includes media, e.g., 'url', 'preview_image_url'.
     * @param {string[]} [options.userFields] - Array of user fields to include, if user information is requested, e.g., 'username', 'verified'.
     * @param {string[]} [options.placeFields] - Array of place fields to include, if the tweet includes location data, e.g., 'full_name', 'country'.
     * @returns {Promise<TweetV2 | null>} - The tweet data, including requested expansions and fields.
     */
    getTweetV2(id: string, options?: {
        expansions?: TTweetv2Expansion[];
        tweetFields?: TTweetv2TweetField[];
        pollFields?: TTweetv2PollField[];
        mediaFields?: TTweetv2MediaField[];
        userFields?: TTweetv2UserField[];
        placeFields?: TTweetv2PlaceField[];
    }): Promise<Tweet | null>;
    /**
     * Fetches multiple tweets by IDs using the Twitter API v2.
     * Allows specifying optional expansions and fields for more detailed data.
     *
     * @param {string[]} ids - Array of tweet IDs to fetch.
     * @param {Object} [options] - Optional parameters to customize the tweet data.
     * @param {string[]} [options.expansions] - Array of expansions to include, e.g., 'attachments.poll_ids'.
     * @param {string[]} [options.tweetFields] - Array of tweet fields to include, e.g., 'created_at', 'public_metrics'.
     * @param {string[]} [options.pollFields] - Array of poll fields to include, if tweets contain polls, e.g., 'options', 'end_datetime'.
     * @param {string[]} [options.mediaFields] - Array of media fields to include, if tweets contain media, e.g., 'url', 'preview_image_url'.
     * @param {string[]} [options.userFields] - Array of user fields to include, if user information is requested, e.g., 'username', 'verified'.
     * @param {string[]} [options.placeFields] - Array of place fields to include, if tweets contain location data, e.g., 'full_name', 'country'.
     * @returns {Promise<TweetV2[]> } - Array of tweet data, including requested expansions and fields.
     */
    getTweetsV2(ids: string[], options?: {
        expansions?: TTweetv2Expansion[];
        tweetFields?: TTweetv2TweetField[];
        pollFields?: TTweetv2PollField[];
        mediaFields?: TTweetv2MediaField[];
        userFields?: TTweetv2UserField[];
        placeFields?: TTweetv2PlaceField[];
    }): Promise<Tweet[]>;
    /**
     * Returns if the scraper has a guest token. The token may not be valid.
     * @returns `true` if the scraper has a guest token; otherwise `false`.
     */
    hasGuestToken(): boolean;
    /**
     * Returns if the scraper is logged in as a real user.
     * @returns `true` if the scraper is logged in with a real user account; otherwise `false`.
     */
    isLoggedIn(): Promise<boolean>;
    /**
     * Returns the currently logged in user
     * @returns The currently logged in user
     */
    me(): Promise<Profile | undefined>;
    /**
     * Login to Twitter as a real Twitter account. This enables running
     * searches.
     * @param username The username of the Twitter account to login with.
     * @param password The password of the Twitter account to login with.
     * @param email The email to log in with, if you have email confirmation enabled.
     * @param twoFactorSecret The secret to generate two factor authentication tokens with, if you have two factor authentication enabled.
     */
    login(username: string, password: string, email?: string, twoFactorSecret?: string, appKey?: string, appSecret?: string, accessToken?: string, accessSecret?: string): Promise<void>;
    /**
     * Log out of Twitter.
     */
    logout(): Promise<void>;
    /**
     * Retrieves all cookies for the current session.
     * @returns All cookies for the current session.
     */
    getCookies(): Promise<Cookie[]>;
    /**
     * Set cookies for the current session.
     * @param cookies The cookies to set for the current session.
     */
    setCookies(cookies: (string | Cookie)[]): Promise<void>;
    /**
     * Clear all cookies for the current session.
     */
    clearCookies(): Promise<void>;
    /**
     * Sets the optional cookie to be used in requests.
     * @param _cookie The cookie to be used in requests.
     * @deprecated This function no longer represents any part of Twitter's auth flow.
     * @returns This scraper instance.
     */
    withCookie(_cookie: string): Scraper;
    /**
     * Sets the optional CSRF token to be used in requests.
     * @param _token The CSRF token to be used in requests.
     * @deprecated This function no longer represents any part of Twitter's auth flow.
     * @returns This scraper instance.
     */
    withXCsrfToken(_token: string): Scraper;
    /**
     * Sends a quote tweet.
     * @param text The text of the tweet.
     * @param quotedTweetId The ID of the tweet to quote.
     * @param options Optional parameters, such as media data.
     * @returns The response from the Twitter API.
     */
    sendQuoteTweet(text: string, quotedTweetId: string, options?: {
        mediaData: {
            data: Buffer;
            mediaType: string;
        }[];
    }): Promise<Response>;
    /**
     * Likes a tweet with the given tweet ID.
     * @param tweetId The ID of the tweet to like.
     * @returns A promise that resolves when the tweet is liked.
     */
    likeTweet(tweetId: string): Promise<void>;
    /**
     * Retweets a tweet with the given tweet ID.
     * @param tweetId The ID of the tweet to retweet.
     * @returns A promise that resolves when the tweet is retweeted.
     */
    retweet(tweetId: string): Promise<void>;
    /**
     * Follows a user with the given user ID.
     * @param userId The user ID of the user to follow.
     * @returns A promise that resolves when the user is followed.
     */
    followUser(userName: string): Promise<void>;
    /**
     * Fetches direct message conversations
     * @param count Number of conversations to fetch (default: 50)
     * @param cursor Pagination cursor for fetching more conversations
     * @returns Array of DM conversations and other details
     */
    getDirectMessageConversations(userId: string, cursor?: string): Promise<DirectMessagesResponse>;
    /**
     * Sends a direct message to a user.
     * @param conversationId The ID of the conversation to send the message to.
     * @param text The text of the message to send.
     * @returns The response from the Twitter API.
     */
    sendDirectMessage(conversationId: string, text: string): Promise<SendDirectMessageResponse>;
    private getAuthOptions;
    private handleResponse;
    /**
     * Retrieves the details of an Audio Space by its ID.
     * @param id The ID of the Audio Space.
     * @returns The details of the Audio Space.
     */
    getAudioSpaceById(id: string): Promise<AudioSpace>;
    /**
     * Retrieves available space topics.
     * @returns An array of space topics.
     */
    browseSpaceTopics(): Promise<Subtopic[]>;
    /**
     * Retrieves available communities.
     * @returns An array of communities.
     */
    communitySelectQuery(): Promise<Community[]>;
    /**
     * Retrieves the status of an Audio Space stream by its media key.
     * @param mediaKey The media key of the Audio Space.
     * @returns The status of the Audio Space stream.
     */
    getAudioSpaceStreamStatus(mediaKey: string): Promise<LiveVideoStreamStatus>;
    /**
     * Retrieves the status of an Audio Space by its ID.
     * This method internally fetches the Audio Space to obtain the media key,
     * then retrieves the stream status using the media key.
     * @param audioSpaceId The ID of the Audio Space.
     * @returns The status of the Audio Space stream.
     */
    getAudioSpaceStatus(audioSpaceId: string): Promise<LiveVideoStreamStatus>;
    /**
     * Authenticates Periscope to obtain a token.
     * @returns The Periscope authentication token.
     */
    authenticatePeriscope(): Promise<string>;
    /**
     * Logs in to Twitter via Proxsee using the Periscope JWT.
     * @param jwt The JWT obtained from AuthenticatePeriscope.
     * @returns The response containing the cookie and user information.
     */
    loginTwitterToken(jwt: string): Promise<LoginTwitterTokenResponse>;
    /**
     * Orchestrates the flow: get token -> login -> return Periscope cookie
     */
    getPeriscopeCookie(): Promise<string>;
}

interface AudioData {
    bitsPerSample: number;
    sampleRate: number;
    channelCount: number;
    numberOfFrames: number;
    samples: Int16Array;
}
interface AudioDataWithUser extends AudioData {
    userId: string;
}
interface SpaceConfig {
    mode: 'BROADCAST' | 'LISTEN' | 'INTERACTIVE';
    title?: string;
    description?: string;
    languages?: string[];
}
interface BroadcastCreated {
    room_id: string;
    credential: string;
    stream_name: string;
    webrtc_gw_url: string;
    broadcast: {
        user_id: string;
        twitter_id: string;
        media_key: string;
    };
    access_token: string;
    endpoint: string;
    share_url: string;
    stream_url: string;
}
interface Plugin {
    /**
     * onAttach is called immediately when .use(plugin) is invoked,
     * passing the Space instance (if needed for immediate usage).
     */
    onAttach?(space: Space): void;
    /**
     * init is called once the Space has *fully* initialized (Janus, broadcast, etc.)
     * so the plugin can get references to Janus or final config, etc.
     */
    init?(params: {
        space: Space;
        pluginConfig?: Record<string, any>;
    }): void;
    onAudioData?(data: AudioDataWithUser): void;
    cleanup?(): void;
}
interface SpeakerInfo {
    userId: string;
    sessionUUID: string;
    janusParticipantId?: number;
}

/**
 * This class orchestrates:
 * 1) Creation of the broadcast
 * 2) Instantiation of Janus + Chat
 * 3) Approve speakers, push audio, etc.
 */
declare class Space extends EventEmitter {
    private readonly scraper;
    private janusClient?;
    private chatClient?;
    private authToken?;
    private broadcastInfo?;
    private isInitialized;
    private plugins;
    private speakers;
    constructor(scraper: Scraper);
    use(plugin: Plugin, config?: Record<string, any>): this;
    /**
     * Main entry point
     */
    initialize(config: SpaceConfig): Promise<BroadcastCreated>;
    reactWithEmoji(emoji: string): void;
    private setupChatEvents;
    /**
     * Approves a speaker on Periscope side, then subscribes on Janus side
     */
    approveSpeaker(userId: string, sessionUUID: string): Promise<void>;
    private callApproveEndpoint;
    /**
     * Removes a speaker (userId) on the Twitter side (audiospace/stream/eject)
     * then unsubscribes in Janus if needed.
     */
    removeSpeaker(userId: string): Promise<void>;
    /**
     * Calls the audiospace/stream/eject endpoint to remove a speaker on Twitter
     */
    private callRemoveEndpoint;
    pushAudio(samples: Int16Array, sampleRate: number): void;
    /**
     * This method is called by JanusClient on 'audioDataFromSpeaker'
     * or we do it from the 'initialize(...)' once Janus is set up.
     */
    private handleAudioData;
    /**
     * Gracefully end the Space (stop broadcast, destroy Janus room, etc.)
     */
    finalizeSpace(): Promise<void>;
    /**
     * Calls the endAudiospace endpoint from Twitter
     */
    private endAudiospace;
    getSpeakers(): SpeakerInfo[];
    stop(): Promise<void>;
}

/**
 * MVP plugin for speech-to-text (OpenAI) + conversation + TTS (ElevenLabs)
 * Approach:
 *   - Collect each speaker's unmuted PCM in a memory buffer (only if above silence threshold)
 *   - On speaker mute -> flush STT -> GPT -> TTS -> push to Janus
 */
declare class SttTtsPlugin implements Plugin {
    private space?;
    private janus?;
    private openAiApiKey?;
    private elevenLabsApiKey?;
    private sttLanguage;
    private gptModel;
    private voiceId;
    private elevenLabsModel;
    private systemPrompt;
    private chatContext;
    /**
     * userId => arrayOfChunks (PCM Int16)
     */
    private pcmBuffers;
    /**
     * Track mute states: userId => boolean (true=unmuted)
     */
    private speakerUnmuted;
    /**
     * For ignoring near-silence frames (if amplitude < threshold)
     */
    private silenceThreshold;
    onAttach(space: Space): void;
    init(params: {
        space: Space;
        pluginConfig?: Record<string, any>;
    }): void;
    /**
     * Called whenever we receive PCM from a speaker
     */
    onAudioData(data: AudioDataWithUser): void;
    /**
     * On speaker mute => flush STT => GPT => TTS => push to Janus
     */
    private handleMute;
    /**
     * Convert Int16 PCM -> WAV using ffmpeg
     */
    private convertPcmToWav;
    /**
     * OpenAI Whisper STT
     */
    private transcribeWithOpenAI;
    /**
     * Simple ChatGPT call
     */
    private askChatGPT;
    /**
     * ElevenLabs TTS => returns MP3 Buffer
     */
    private elevenLabsTts;
    /**
     * Convert MP3 => PCM via ffmpeg
     */
    private convertMp3ToPcm;
    /**
     * Push PCM back to Janus in small frames
     * We'll do 10ms @48k => 960 samples per frame
     */
    private streamToJanus;
    speakText(text: string): Promise<void>;
    /**
     * Change the system prompt at runtime.
     */
    setSystemPrompt(prompt: string): void;
    /**
     * Change the GPT model at runtime (e.g. "gpt-4", "gpt-3.5-turbo", etc.).
     */
    setGptModel(model: string): void;
    /**
     * Add a message (system, user or assistant) to the chat context.
     * E.g. to store conversation history or inject a persona.
     */
    addMessage(role: 'system' | 'user' | 'assistant', content: string): void;
    /**
     * Clear the chat context if needed.
     */
    clearChatContext(): void;
    cleanup(): void;
}

declare class RecordToDiskPlugin implements Plugin {
    private outStream;
    onAudioData(data: AudioDataWithUser): void;
    cleanup(): void;
}

declare class MonitorAudioPlugin implements Plugin {
    private readonly sampleRate;
    private ffplay?;
    constructor(sampleRate?: number);
    onAudioData(data: AudioDataWithUser): void;
    cleanup(): void;
}

/**
 * Plugin that tracks the last speaker audio timestamp
 * and the last local audio timestamp to detect overall silence.
 */
declare class IdleMonitorPlugin implements Plugin {
    private idleTimeoutMs;
    private checkEveryMs;
    private space?;
    private lastSpeakerAudioMs;
    private lastLocalAudioMs;
    private checkInterval?;
    /**
     * @param idleTimeoutMs How many ms of silence before triggering idle (default 60s)
     * @param checkEveryMs Interval for checking silence (default 10s)
     */
    constructor(idleTimeoutMs?: number, checkEveryMs?: number);
    onAttach(space: Space): void;
    init(params: {
        space: Space;
        pluginConfig?: Record<string, any>;
    }): void;
    private checkIdle;
    /**
     * Returns how many ms have passed since any audio was detected.
     */
    getIdleTimeMs(): number;
    cleanup(): void;
}

export { type Admin, type AudioSpace, type AudioSpaceByIdResponse, type AudioSpaceByIdVariables, type AuthenticatePeriscopeResponse, type BrowseSpaceTopics, type BrowseSpaceTopicsResponse, type Category, type Community, type CommunitySelectQueryResponse, type CreatorResult, IdleMonitorPlugin, type LiveVideoSource, type LiveVideoStreamStatus, type LoginTwitterTokenResponse, type Metadata, MonitorAudioPlugin, type Participants, type Profile, type QueryProfilesResponse, type QueryTweetsResponse, RecordToDiskPlugin, Scraper, SearchMode, type Sharings, Space, SttTtsPlugin, type Subtopic, type Tweet, type UserResults };
