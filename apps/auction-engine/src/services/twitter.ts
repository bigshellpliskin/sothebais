import { TwitterApi } from 'twitter-api-v2';
import { logger } from '../utils/logger';

/**
 * Twitter Service
 * 
 * Handles integration with Twitter API for:
 * - Authentication
 * - Tweet monitoring
 * - Bid processing
 * - Tweet responses
 */
export class TwitterService {
  private client: TwitterApi | null = null;
  private isInitialized = false;
  private tweetStream: any = null;
  private userId: string = '';

  /**
   * Initialize the Twitter client with credentials
   */
  public async initialize(credentials: {
    appKey: string;
    appSecret: string;
    accessToken: string;
    accessSecret: string;
  }): Promise<boolean> {
    try {
      this.client = new TwitterApi({
        appKey: credentials.appKey,
        appSecret: credentials.appSecret,
        accessToken: credentials.accessToken,
        accessSecret: credentials.accessSecret,
      });

      // Test connection
      const user = await this.client.v2.me();
      this.userId = user.data.id;
      logger.info(`Twitter API connected for user: ${user.data.username} (ID: ${this.userId})`);
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('Failed to initialize Twitter client', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Check if the Twitter client is initialized
   */
  public isConnected(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Test the connection by fetching recent tweets
   */
  public async testConnection(): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Twitter client not initialized');
    }

    try {
      // Get recent tweets from the user timeline
      const timeline = await this.client!.v2.userTimeline(this.userId, {
        max_results: 10,
      });
      
      const tweets = timeline.data.data || [];
      logger.info(`Successfully fetched ${tweets.length} tweets`);
      
      return {
        success: true,
        tweets,
      };
    } catch (error) {
      logger.error('Failed to test Twitter connection', error);
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Post a tweet (for auction status updates or bid confirmations)
   */
  public async postTweet(message: string): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Twitter client not initialized');
    }

    try {
      const tweet = await this.client!.v2.tweet(message);
      logger.info(`Posted tweet with ID: ${tweet.data.id}`);
      
      return {
        success: true,
        tweetId: tweet.data.id,
      };
    } catch (error) {
      logger.error('Failed to post tweet', error);
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Start monitoring tweets for a specific hashtag or search term
   * Note: Twitter API v2 filtered stream requires Elevated access 
   */
  public async monitorTweets(searchQuery: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Twitter client not initialized');
    }

    try {
      // For testing purposes, we'll use search API instead of streams
      // Production would use filtered streams for real-time monitoring
      const searchResults = await this.client!.v2.search(searchQuery);
      
      logger.info(`Found ${searchResults.data.meta.result_count} tweets matching "${searchQuery}"`);
      
      // Process each tweet (in production, this would be real-time)
      searchResults.data.data?.forEach(tweet => {
        this.processPotentialBidTweet(tweet);
      });
    } catch (error) {
      logger.error(`Failed to monitor tweets for "${searchQuery}"`, error);
    }
  }

  /**
   * Process a tweet to check if it's a valid bid
   * This is a placeholder for actual bid processing logic
   */
  private processPotentialBidTweet(tweet: any): void {
    logger.info(`Processing tweet: ${tweet.id}`);
    
    // Example logic - would be more complex in production
    const tweetText = tweet.text.toLowerCase();
    
    // Check if tweet contains bid-related keywords
    if (tweetText.includes('bid') || tweetText.includes('eth')) {
      logger.info(`Potential bid detected in tweet: ${tweet.id}`);
      
      // TODO: Extract bid amount, validate, and process
      // This would connect to auction engine logic
    }
  }

  /**
   * Cleanup resources when shutting down
   */
  public async shutdown(): Promise<void> {
    if (this.tweetStream) {
      try {
        await this.tweetStream.close();
        logger.info('Twitter stream closed');
      } catch (error) {
        logger.error('Error closing Twitter stream', error);
      }
    }
    
    this.client = null;
    this.isInitialized = false;
    logger.info('Twitter service shutdown complete');
  }
}

// Export a singleton instance
export const twitterService = new TwitterService(); 