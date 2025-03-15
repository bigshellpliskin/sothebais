/**
 * Redis Key Patterns
 * 
 * This file defines the key patterns used in Redis for various data types
 * and provides helper functions to generate and parse keys.
 */

// Key Prefixes
export const KEY_PREFIX = {
  // Campaign related keys
  CAMPAIGN: 'campaign',
  CAMPAIGN_DAY: 'campaign:day',
  // Auction related keys
  AUCTION: 'auction',
  AUCTION_PRICE: 'auction:price',
  AUCTION_BID: 'auction:bid',
  AUCTION_TIMER: 'auction:timer',
  
  // Stream related keys
  STREAM: 'stream',
  STREAM_SCENE: 'stream:scene',
  STREAM_METRICS: 'stream:metrics',
  STREAM_VIEWERS: 'stream:viewers',
  
  // Agent related keys
  AGENT: 'agent',
  AGENT_MOOD: 'agent:mood',
  AGENT_CONTEXT: 'agent:context',
  AGENT_SCENE: 'agent:scene',
  
  // System related keys
  LOCK: 'lock',
  RATE_LIMIT: 'rate:limit',
  SESSION: 'session',
  CACHE: 'cache',
};

// TTL Values (in seconds)
export const TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 1 day
  WEEK: 604800, // 1 week
  MONTH: 2592000, // 30 days
  PERMANENT: -1, // No expiration
};

/**
 * Helper functions to generate Redis keys
 */

// Campaign Keys
export const campaignKey = (campaignId: string): string => `${KEY_PREFIX.CAMPAIGN}:${campaignId}`;
export const campaignDayKey = (campaignId: string, day: number): string => `${KEY_PREFIX.CAMPAIGN_DAY}:${campaignId}:${day}`;

// Auction Keys
export const auctionKey = (auctionId: string): string => `${KEY_PREFIX.AUCTION}:${auctionId}`;
export const auctionPriceKey = (auctionId: string): string => `${KEY_PREFIX.AUCTION_PRICE}:${auctionId}`;
export const auctionBidKey = (auctionId: string): string => `${KEY_PREFIX.AUCTION_BID}:${auctionId}`;
export const auctionTimerKey = (auctionId: string): string => `${KEY_PREFIX.AUCTION_TIMER}:${auctionId}`;

// Stream Keys
export const streamKey = (streamId: string): string => `${KEY_PREFIX.STREAM}:${streamId}`;
export const streamSceneKey = (streamId: string): string => `${KEY_PREFIX.STREAM_SCENE}:${streamId}`;
export const streamMetricsKey = (streamId: string): string => `${KEY_PREFIX.STREAM_METRICS}:${streamId}`;
export const streamViewersKey = (streamId: string): string => `${KEY_PREFIX.STREAM_VIEWERS}:${streamId}`;

// Agent Keys
export const agentKey = (agentId: string): string => `${KEY_PREFIX.AGENT}:${agentId}`;
export const agentMoodKey = (agentId: string): string => `${KEY_PREFIX.AGENT_MOOD}:${agentId}`;
export const agentContextKey = (agentId: string): string => `${KEY_PREFIX.AGENT_CONTEXT}:${agentId}`;
export const agentSceneKey = (agentId: string): string => `${KEY_PREFIX.AGENT_SCENE}:${agentId}`;

// System Keys
export const lockKey = (resource: string): string => `${KEY_PREFIX.LOCK}:${resource}`;
export const rateLimitKey = (resource: string, identifier: string): string => `${KEY_PREFIX.RATE_LIMIT}:${resource}:${identifier}`;
export const sessionKey = (sessionId: string): string => `${KEY_PREFIX.SESSION}:${sessionId}`;
export const cacheKey = (key: string): string => `${KEY_PREFIX.CACHE}:${key}`;

/**
 * Helper functions to parse Redis keys
 */

// Extract ID from a key
export const extractId = (key: string): string | null => {
  const parts = key.split(':');
  return parts.length >= 2 ? parts[parts.length - 1] ?? null : null;
};

// Check if a key matches a prefix
export const keyMatchesPrefix = (key: string, prefix: string): boolean => {
  return key.startsWith(`${prefix}:`);
};

// Redis Pub/Sub Channels
export const CHANNELS = {
  // Auction events
  AUCTION_EVENTS: 'events:auction',
  
  // Stream events
  STREAM_EVENTS: 'events:stream',
  
  // Agent events
  AGENT_EVENTS: 'events:agent',
  
  // User events
  USER_EVENTS: 'events:user',
  
  // System events
  SYSTEM_EVENTS: 'events:system',
};

/**
 * Extract the last part of a Redis key
 * For example, "auction:123:bids" will return "bids"
 */
export function getKeyLastPart(key: string): string | null {
  const parts = key.split(':');
  return parts.length >= 2 ? parts[parts.length - 1] ?? null : null;
} 