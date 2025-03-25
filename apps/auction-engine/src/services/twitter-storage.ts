import { logger } from '../utils/logger.js';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import type { TwitterApiTweet } from '@sothebais/packages/types/twitter';

// Redis key prefixes
const TWEET_CACHE_PREFIX = 'twitter:tweet:';
const BID_TWEET_SET = 'twitter:bids';
const RATE_LIMIT_PREFIX = 'twitter:ratelimit:';
const ACTIVE_STREAM_KEY = 'twitter:stream:active';

// Define type for Tweet using Prisma namespace
type Tweet = {
  id: string;
  tweetId: string;
  content: string;
  authorId: string;
  postedAt: Date;
  createdAt: Date;
  isBid: boolean;
  isProcessed: boolean;
  metadata: any;
  userId?: string | null;
};

/**
 * TwitterStorage Service
 * 
 * Handles storage of Twitter data using Redis for real-time data
 * and PostgreSQL (via Prisma) for persistent storage.
 */
export class TwitterStorage {
  private static instance: TwitterStorage | null = null;
  private redis: Redis;
  private prisma: PrismaClient;
  
  private constructor(redisUrl: string) {
    // Initialize Redis client
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });
    
    this.redis.on('error', (error) => {
      logger.error('Redis connection error in TwitterStorage', error);
    });
    
    // Initialize Prisma client
    this.prisma = new PrismaClient();
  }
  
  public static initialize(redisUrl: string): TwitterStorage {
    if (!TwitterStorage.instance) {
      TwitterStorage.instance = new TwitterStorage(redisUrl);
    }
    return TwitterStorage.instance;
  }
  
  public static getInstance(): TwitterStorage {
    if (!TwitterStorage.instance) {
      throw new Error('TwitterStorage not initialized');
    }
    return TwitterStorage.instance;
  }
  
  /**
   * Store a tweet in both Redis (short-term) and PostgreSQL (long-term)
   */
  public async storeTweet(tweet: TwitterApiTweet, isBid: boolean = false): Promise<void> {
    try {
      // Store in Redis for immediate access
      await this.redis.set(
        `${TWEET_CACHE_PREFIX}${tweet.id}`,
        JSON.stringify(tweet),
        'EX',
        3600 // Expire after 1 hour
      );
      
      // If it's a bid tweet, add to bid tweet set
      if (isBid) {
        await this.redis.zadd(BID_TWEET_SET, Date.now(), tweet.id);
      }
      
      // Store in PostgreSQL for permanent storage
      await this.prisma.tweet.create({
        data: {
          tweetId: tweet.id,
          authorId: tweet.author_id,
          content: tweet.text,
          postedAt: new Date(tweet.created_at),
          isBid: isBid,
          isProcessed: false,
          metadata: tweet
        }
      });
      
      logger.info(`Tweet ${tweet.id} stored successfully`, {
        isBid,
        authorId: tweet.author_id
      });
    } catch (error) {
      logger.error('Failed to store tweet', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tweetId: tweet.id
      });
      throw error;
    }
  }
  
  /**
   * Get recent bid tweets from Redis
   */
  public async getRecentBidTweets(count: number = 10): Promise<TwitterApiTweet[]> {
    try {
      const tweetIds = await this.redis.zrevrange(BID_TWEET_SET, 0, count - 1);
      
      if (!tweetIds.length) {
        return [];
      }
      
      const tweets: TwitterApiTweet[] = [];
      for (const id of tweetIds) {
        const tweetData = await this.redis.get(`${TWEET_CACHE_PREFIX}${id}`);
        if (tweetData) {
          tweets.push(JSON.parse(tweetData));
        }
      }
      
      return tweets;
    } catch (error) {
      logger.error('Failed to get recent bid tweets', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }
  
  /**
   * Store rate limit information
   */
  public async updateRateLimit(endpoint: string, remaining: number, reset: number): Promise<void> {
    try {
      await this.redis.hmset(`${RATE_LIMIT_PREFIX}${endpoint}`, {
        remaining,
        reset,
        updated: Date.now()
      });
    } catch (error) {
      logger.error('Failed to update rate limit information', {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint
      });
    }
  }
  
  /**
   * Get rate limit information for an endpoint
   */
  public async getRateLimit(endpoint: string): Promise<{ remaining: number; reset: number; updated: number } | null> {
    try {
      const data = await this.redis.hgetall(`${RATE_LIMIT_PREFIX}${endpoint}`);
      if (!data || !data['remaining']) {
        return null;
      }
      
      return {
        remaining: parseInt(data['remaining'], 10),
        reset: parseInt(data['reset'] || '0', 10),
        updated: parseInt(data['updated'] || '0', 10)
      };
    } catch (error) {
      logger.error('Failed to get rate limit information', {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint
      });
      return null;
    }
  }
  
  /**
   * Get tweet by ID from PostgreSQL (for historical data)
   */
  public async getTweetById(tweetId: string): Promise<Tweet | null> {
    try {
      const tweet = await this.prisma.tweet.findUnique({
        where: { tweetId }
      });
      
      return tweet as Tweet | null;
    } catch (error) {
      logger.error('Failed to get tweet by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tweetId
      });
      return null;
    }
  }
  
  /**
   * Get historical bid tweets from PostgreSQL
   */
  public async getHistoricalBidTweets(
    limit: number = 100,
    offset: number = 0
  ): Promise<Tweet[]> {
    try {
      const tweets = await this.prisma.tweet.findMany({
        where: { isBid: true },
        orderBy: { postedAt: 'desc' },
        take: limit,
        skip: offset
      });
      
      return tweets as Tweet[];
    } catch (error) {
      logger.error('Failed to get historical bid tweets', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }
  
  /**
   * Track active Twitter stream status
   */
  public async setStreamActive(isActive: boolean): Promise<void> {
    try {
      if (isActive) {
        await this.redis.set(ACTIVE_STREAM_KEY, 'true', 'EX', 86400); // 24 hours
      } else {
        await this.redis.del(ACTIVE_STREAM_KEY);
      }
      
      logger.info(`Twitter stream status set to ${isActive ? 'active' : 'inactive'}`);
    } catch (error) {
      logger.error('Failed to update Twitter stream status', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Check if Twitter stream is active
   */
  public async isStreamActive(): Promise<boolean> {
    try {
      const status = await this.redis.get(ACTIVE_STREAM_KEY);
      return status === 'true';
    } catch (error) {
      logger.error('Failed to check Twitter stream status', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
  
  /**
   * Clean up resources
   */
  public async shutdown(): Promise<void> {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      logger.info('TwitterStorage shutdown complete');
    } catch (error) {
      logger.error('Error during TwitterStorage shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
} 