# Twitter Integration for SothebAIs

This document explains how to set up and configure Twitter integration for the SothebAIs platform, covering both API interaction and live broadcasting.

## Table of Contents

1. [Overview](#overview)
2. [Twitter API Integration](#twitter-api-integration)
   - [Setting Up Credentials](#setting-up-credentials)
   - [Testing the Connection](#testing-the-connection)
   - [Implementing Tweet Monitoring](#implementing-tweet-monitoring)
3. [Twitter Live Broadcasting](#twitter-live-broadcasting)
   - [Requirements](#requirements)
   - [Getting Twitter Stream Keys](#getting-twitter-stream-keys)
   - [Configuring the Stream Manager](#configuring-the-stream-manager)
   - [Testing the Broadcast](#testing-the-broadcast)
4. [Architecture Integration](#architecture-integration)
   - [Auction Engine + Twitter API](#auction-engine--twitter-api)
   - [Stream Manager + Twitter Broadcast](#stream-manager--twitter-broadcast)
5. [Troubleshooting](#troubleshooting)

## Overview

SothebAIs integrates with Twitter in two primary ways:

1. **Twitter API Integration**: For monitoring bid tweets, posting auction updates, and interacting with users
2. **Live Broadcasting**: For streaming auctions to Twitter audiences through the platform's RTMP ingest service

## Twitter API Integration

### Setting Up Credentials

1. Create a Twitter Developer account at [developer.twitter.com](https://developer.twitter.com)
2. Create a new Project and App to get your API credentials
3. Set the app permissions to include Read and Write
4. Generate Consumer Keys (API Key and Secret) and Access Token (Access Token and Secret)
5. Add these credentials to your `.env` file:

```
# Twitter API credentials
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here
```

### Testing the Connection

Test your Twitter API integration with the provided test script:

```bash
cd apps/auction-engine
npm run test:twitter
```

This will verify your credentials and demonstrate basic Twitter API functionality.

### Implementing Tweet Monitoring

The Auction Engine will monitor tweets for bids using the API. The integration is handled through the `TwitterService` in `apps/auction-engine/src/services/twitter.ts`.

Example of monitoring tweets with a specific query:

```typescript
const twitterService = TwitterService.getInstance();
await twitterService.monitorTweets('#SothebAIsAuction bid');
```

## Twitter Live Broadcasting

### Requirements

To broadcast to Twitter, you'll need:

1. A Twitter account with the ability to create broadcasts
2. RTMP URL and Stream Key from Twitter
3. Stream Manager properly configured

### Getting Twitter Stream Keys

1. Go to [Twitter Media Studio](https://media.twitter.com/)
2. Create a new broadcast
3. Select "Connect external encoder"
4. Twitter will provide an RTMP URL and Stream Key

### Configuring the Stream Manager

Add the Twitter broadcast information to your `.env` file:

```
# Twitter Broadcast
TWITTER_RTMP_URL=rtmp://ca.pscp.tv:80/x
TWITTER_RTMPS_URL=rtmps://ca.pscp.tv:443/x
TWITTER_STREAM_KEY=your_stream_key_here
TWITTER_BROADCAST_ENABLED=true
```

The Stream Manager will automatically configure Twitter broadcasting if these values are set.

### Testing the Broadcast

1. Start the Stream Manager service
2. The stream will be automatically sent to Twitter if `TWITTER_BROADCAST_ENABLED=true`
3. Check Twitter to confirm that your broadcast is working

## Architecture Integration

### Auction Engine + Twitter API

The Twitter API integration is primarily handled by the Auction Engine service. The integration:

1. Monitors tweets for bid keywords
2. Processes valid bids
3. Posts updates and confirmation tweets
4. Manages interactions with bidders

### Stream Manager + Twitter Broadcast

The Stream Manager handles the video broadcasting to Twitter using RTMP:

1. Stream Manager composes the video stream
2. The RTMP server in Stream Manager handles the output
3. Twitter receives the RTMP stream
4. Twitter makes the broadcast available to viewers

## Troubleshooting

### Twitter API Issues

- Verify your credentials are correct
- Check Twitter API rate limits 
- Ensure your app has the correct permissions
- Look for network connectivity issues

### Broadcast Issues

- Verify your RTMP URL and Stream Key are correct
- Ensure your stream settings meet Twitter's requirements (resolution, bitrate, etc.)
- Check network connectivity and bandwidth
- Inspect Stream Manager logs for errors
- Verify Twitter Media Studio is set up correctly

Common error: "Failed to connect to RTMP server" - usually means the Stream Key is invalid or expired.

## Resources

- [Twitter API Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [Twitter Broadcast Requirements](https://help.twitter.com/en/using-twitter/twitter-live)
- [RTMP Specification](https://www.adobe.com/devnet/rtmp.html) 