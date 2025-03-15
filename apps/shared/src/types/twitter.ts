/**
 * Twitter API Types
 * 
 * Shared types for Twitter integration used across services
 */

/**
 * Twitter API Tweet (simplified representation of Twitter API response)
 */
export interface TwitterApiTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  [key: string]: any; // Additional fields from Twitter API
}

/**
 * Twitter Bid from a tweet
 * Used when processing bids from Twitter
 */
export interface TwitterBid {
  userId: string;      // Twitter user ID
  tweetId: string;     // Twitter tweet ID
  amount: number;      // Bid amount
  timestamp: Date;     // When the bid was placed
  rawContent: string;  // Raw tweet content
}

/**
 * Status for Twitter streams
 */
export type TwitterStreamStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'RECONNECTING';

/**
 * Twitter stream configuration
 */
export interface TwitterStreamConfig {
  type: 'FILTERED' | 'SAMPLED' | 'RULES';
  query?: string;
  rules?: TwitterStreamRule[];
  isActive: boolean;
}

/**
 * Twitter stream rule for filtered streams
 */
export interface TwitterStreamRule {
  id?: string;
  value: string;
  tag?: string;
}

/**
 * Twitter API rate limit information
 */
export interface TwitterRateLimit {
  endpoint: string;
  remaining: number;
  reset: number;
  updated: number;
}

/**
 * Twitter user profile information
 */
export interface TwitterUserProfile {
  id: string;
  username: string;
  name: string;
  profileImageUrl?: string;
  verified?: boolean;
  createdAt?: Date;
}

/**
 * Twitter broadcast configuration
 */
export interface TwitterBroadcastConfig {
  rtmpUrl: string;
  streamKey: string;
  isEnabled: boolean;
}

/**
 * Bid structure for database
 */
export interface BidData {
  amount: number;
  currency: string;
  status: string;
  source: string;
  auctionId: string;
  userId: string;
  tweetId: string;
} 