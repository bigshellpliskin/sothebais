import { twitterService } from '../services/twitter';
import { logger } from '../utils/logger';

/**
 * Twitter Integration Test Script
 * 
 * This script tests the Twitter API integration by:
 * 1. Initializing the Twitter client
 * 2. Testing connection to the Twitter API
 * 3. Fetching recent tweets
 * 4. Optionally posting a test tweet
 * 5. Monitoring tweets with a specific query
 * 
 * Usage:
 * 1. Set Twitter API credentials in .env file:
 *    - TWITTER_API_KEY
 *    - TWITTER_API_SECRET
 *    - TWITTER_ACCESS_TOKEN
 *    - TWITTER_ACCESS_TOKEN_SECRET
 * 2. Run script: `npm run test:twitter`
 */

async function runTwitterTest() {
  logger.info('Starting Twitter integration test');

  // Check for required environment variables
  const requiredEnvVars = [
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    logger.info('Please set these variables in your .env file before running the test');
    process.exit(1);
  }

  try {
    // Initialize Twitter client
    logger.info('Initializing Twitter client...');
    const initialized = await twitterService.initialize({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!
    });

    if (!initialized) {
      logger.error('Failed to initialize Twitter client');
      process.exit(1);
    }

    // Test connection
    logger.info('Testing connection...');
    const connectionTest = await twitterService.testConnection();
    
    if (!connectionTest.success) {
      logger.error('Connection test failed');
      process.exit(1);
    }

    logger.info(`Successfully connected to Twitter API`);
    logger.info(`Found ${connectionTest.tweets.length} recent tweets:`);
    
    // Display tweets
    connectionTest.tweets.forEach((tweet: any, index: number) => {
      logger.info(`${index + 1}. [${tweet.id}]: ${tweet.text.substring(0, 50)}...`);
    });

    // Optionally post a test tweet if POST_TEST_TWEET is set to 'true'
    if (process.env.POST_TEST_TWEET === 'true') {
      logger.info('Posting test tweet...');
      const tweetMessage = `SothebAIs Twitter integration test - ${new Date().toISOString()}`;
      const postResult = await twitterService.postTweet(tweetMessage);
      
      if (postResult.success) {
        logger.info(`Successfully posted test tweet with ID: ${postResult.tweetId}`);
      } else {
        logger.error('Failed to post test tweet');
      }
    }

    // Test monitoring tweets with a specific search query
    const searchQuery = process.env.TWITTER_SEARCH_QUERY || 'nft auction';
    logger.info(`Monitoring tweets with query: "${searchQuery}"...`);
    await twitterService.monitorTweets(searchQuery);

    // Cleanup
    logger.info('Test complete, shutting down Twitter service...');
    await twitterService.shutdown();
    
    logger.info('Twitter integration test completed successfully');
  } catch (error) {
    logger.error('Error during Twitter integration test', error);
    process.exit(1);
  }
}

// Run the test if this script is called directly
if (require.main === module) {
  runTwitterTest().catch(error => {
    logger.error('Unhandled error in Twitter test', error);
    process.exit(1);
  });
}

export { runTwitterTest }; 