/**
 * Redis Key Patterns
 * 
 * This file defines the key patterns used in Redis for various data types
 * and provides helper functions to generate and parse keys.
 */

// Key Prefixes
const KEY_PREFIX = {
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
const TTL = {
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
const campaignKey = (campaignId: string) => `${KEY_PREFIX.CAMPAIGN}:${campaignId}`;
const campaignDayKey = (campaignId: string, day: number) => `${KEY_PREFIX.CAMPAIGN_DAY}:${campaignId}:${day}`;

// Auction Keys
const auctionKey = (auctionId: string) => `${KEY_PREFIX.AUCTION}:${auctionId}`;
const auctionPriceKey = (auctionId: string) => `${KEY_PREFIX.AUCTION_PRICE}:${auctionId}`;
const auctionBidKey = (auctionId: string) => `${KEY_PREFIX.AUCTION_BID}:${auctionId}`;
const auctionTimerKey = (auctionId: string) => `${KEY_PREFIX.AUCTION_TIMER}:${auctionId}`;

// Stream Keys
const streamKey = (streamId: string) => `${KEY_PREFIX.STREAM}:${streamId}`;
const streamSceneKey = (streamId: string) => `${KEY_PREFIX.STREAM_SCENE}:${streamId}`;
const streamMetricsKey = (streamId: string) => `${KEY_PREFIX.STREAM_METRICS}:${streamId}`;
const streamViewersKey = (streamId: string) => `${KEY_PREFIX.STREAM_VIEWERS}:${streamId}`;

// Agent Keys
const agentKey = (agentId: string) => `${KEY_PREFIX.AGENT}:${agentId}`;
const agentMoodKey = (agentId: string) => `${KEY_PREFIX.AGENT_MOOD}:${agentId}`;
const agentContextKey = (agentId: string) => `${KEY_PREFIX.AGENT_CONTEXT}:${agentId}`;
const agentSceneKey = (agentId: string) => `${KEY_PREFIX.AGENT_SCENE}:${agentId}`;

// System Keys
const lockKey = (resource: string) => `${KEY_PREFIX.LOCK}:${resource}`;
const rateLimitKey = (resource: string, identifier: string) => `${KEY_PREFIX.RATE_LIMIT}:${resource}:${identifier}`;
const sessionKey = (sessionId: string) => `${KEY_PREFIX.SESSION}:${sessionId}`;
const cacheKey = (key: string) => `${KEY_PREFIX.CACHE}:${key}`;

/**
 * Helper functions to parse Redis keys
 */

// Extract ID from a key
const extractId = (key: string): string | null => {
  const parts = key.split(':');
  return parts.length >= 2 ? parts[parts.length - 1] : null;
};

// Check if a key matches a prefix
const keyMatchesPrefix = (key: string, prefix: string): boolean => {
  return key.startsWith(`${prefix}:`);
};

// Redis Pub/Sub Channels
const CHANNELS = {
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

// Export all functions and constants
module.exports = {
  TTL,
  campaignKey,
  campaignDayKey,
  auctionKey,
  auctionPriceKey,
  auctionBidKey,
  auctionTimerKey,
  streamKey,
  streamSceneKey,
  streamMetricsKey,
  streamViewersKey,
  agentKey,
  agentMoodKey,
  agentContextKey,
  agentSceneKey,
  lockKey,
  rateLimitKey,
  sessionKey,
  cacheKey,
  extractId,
  keyMatchesPrefix,
  CHANNELS
}; 