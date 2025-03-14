# Twitter API Integration

This service handles Twitter API integration for the SothebAIs platform, providing functionality for:

1. Monitoring bid tweets during auctions
2. Posting auction status updates and bid confirmations
3. Interacting with users via tweet replies
4. Launching and managing Twitter livestreams (via Stream Manager)

## Setup

### Prerequisites

1. Twitter Developer Account with either:
   - Essential Access (basic features)
   - Elevated Access (preferred, for streaming capabilities)

2. Twitter App credentials:
   - API Key and Secret
   - Access Token and Secret

### Configuration

Configure Twitter API credentials in your main `.env` file:

```
# Twitter API credentials
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here

# Optional Twitter test settings
POST_TEST_TWEET=false
TWITTER_SEARCH_QUERY="nft auction"
```

## Usage

### Testing Connection

Run the Twitter test script to verify your credentials and connection:

```bash
npm run test:twitter
```

This will:
1. Initialize the Twitter client
2. Fetch recent tweets
3. Test tweet monitoring (using a search query)

### Integrating in Code

```typescript
import { twitterService } from '../services/twitter';

// Initialize with credentials
await twitterService.initialize({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!
});

// Post a tweet
await twitterService.postTweet('SothebAIs auction starts in 10 minutes!');

// Monitor tweets for bids
await twitterService.monitorTweets('#SothebAIsAuction bid');
```

## RTMP Integration for Livestreams

The Stream Manager service handles the RTMP connection to Twitter's broadcast feature. To connect:

1. Set up Twitter broadcast credentials in Stream Manager:
   - Obtain RTMP URL and stream key from Twitter
   - Configure in Stream Manager settings

2. Use the Stream Manager API to control the broadcast:
   - Start/stop broadcast
   - Monitor stream health
   - Adjust stream settings

## Architecture Notes

In our system architecture:

1. **Auction Engine** handles:
   - Twitter API authentication
   - Bid tweet monitoring and processing
   - Tweet notifications

2. **Stream Manager** handles:
   - RTMP streaming to Twitter
   - Stream composition
   - Broadcast management

3. **Agent Service (ElizaOS)** handles:
   - Twitter interaction responses
   - Character-based Twitter engagement
   - Dynamic response generation

## Future Development

- [ ] Implement webhook-based tweet monitoring (requires Twitter approval)
- [ ] Add rate limiting and backoff strategies
- [ ] Create more robust error handling and retry logic
- [ ] Improve bid extraction from tweets using NLP
- [ ] Enhance stream integration with Twitter's API

## Resources

- [Twitter API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [Twitter API v2 Node.js Client](https://github.com/PLhery/node-twitter-api-v2)
- [Twitter RTMP Broadcasting Guidelines](https://help.twitter.com/en/using-twitter/twitter-live) 