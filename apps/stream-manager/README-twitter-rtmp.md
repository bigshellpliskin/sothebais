# Twitter RTMP Broadcast Integration

This guide explains how to configure the Stream Manager to broadcast to Twitter using the RTMP protocol.

## Overview

The Stream Manager needs to output its composed video stream to Twitter's RTMP ingest servers. This requires:

1. Twitter broadcast credentials (RTMP URL and Stream Key)
2. Configuration of Stream Manager to use these credentials
3. Proper error handling and stream health monitoring

## Prerequisites

- Twitter account with broadcasting permissions
- Twitter Developer App with appropriate permissions
- Stream Manager service up and running

## Twitter Broadcast Setup

1. **Create a Twitter broadcast**:
   - Go to Twitter Studio or use the Twitter API to create a broadcast
   - Get the RTMP URL and Stream Key provided by Twitter

2. **Store credentials securely**:
   - Add the following to your `.env` file:
   ```
   # Twitter Broadcast Credentials
   TWITTER_RTMP_URL=rtmp://live.twitter.com/path/to/ingest
   TWITTER_STREAM_KEY=your-stream-key-from-twitter
   ```

## Stream Manager Configuration

Twitter RTMP streaming is handled by the Stream Manager's encoder component. You have two ways to connect:

### Option 1: Direct Configuration (Development/Testing)

To quickly test broadcasting to Twitter, modify the `StreamEncoder.initialize` method in `stream-manager.ts`:

```typescript
this.encoder = await StreamEncoder.initialize({
  width,
  height,
  fps: config.TARGET_FPS,
  bitrate: config.STREAM_BITRATE.raw,
  bitrateNumeric: config.STREAM_BITRATE.numeric,
  codec: 'h264',
  preset: 'veryfast',
  outputs: [
    // Internal RTMP connection for preview and monitoring
    `rtmp://stream-manager:${config.RTMP_PORT}/live/${streamKey}?role=encoder`,
    
    // Twitter RTMP connection
    `${process.env.TWITTER_RTMP_URL}/${process.env.TWITTER_STREAM_KEY}`
  ]
});
```

### Option 2: Dynamic Configuration (Production)

For a more robust solution, create a dedicated Twitter broadcast manager:

1. Create a new file `apps/stream-manager/src/streaming/output/twitter-broadcaster.ts`:

```typescript
import { logger } from '../../utils/logger.js';
import { StreamEncoder } from './encoder.js';

export class TwitterBroadcaster {
  private static instance: TwitterBroadcaster | null = null;
  private isConnected: boolean = false;
  private streamKey: string | null = null;
  private rtmpUrl: string | null = null;
  
  private constructor() {}
  
  public static getInstance(): TwitterBroadcaster {
    if (!TwitterBroadcaster.instance) {
      TwitterBroadcaster.instance = new TwitterBroadcaster();
    }
    return TwitterBroadcaster.instance;
  }
  
  public async configure(rtmpUrl: string, streamKey: string): Promise<void> {
    this.rtmpUrl = rtmpUrl;
    this.streamKey = streamKey;
    logger.info('Twitter broadcaster configured', { rtmpUrl });
  }
  
  public async addToEncoder(encoder: StreamEncoder): Promise<boolean> {
    if (!this.rtmpUrl || !this.streamKey) {
      logger.error('Twitter broadcast not configured');
      return false;
    }
    
    try {
      const twitterRtmpEndpoint = `${this.rtmpUrl}/${this.streamKey}`;
      await encoder.addOutput(twitterRtmpEndpoint);
      this.isConnected = true;
      logger.info('Added Twitter as broadcast output');
      return true;
    } catch (error) {
      logger.error('Failed to add Twitter as broadcast output', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }
  
  public async removeFromEncoder(encoder: StreamEncoder): Promise<boolean> {
    if (!this.rtmpUrl || !this.streamKey) {
      return false;
    }
    
    try {
      const twitterRtmpEndpoint = `${this.rtmpUrl}/${this.streamKey}`;
      await encoder.removeOutput(twitterRtmpEndpoint);
      this.isConnected = false;
      logger.info('Removed Twitter as broadcast output');
      return true;
    } catch (error) {
      logger.error('Failed to remove Twitter as broadcast output', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }
  
  public isStreaming(): boolean {
    return this.isConnected;
  }
}
```

2. Then use it in the Stream Manager:

```typescript
// In stream-manager.ts
import { TwitterBroadcaster } from './output/twitter-broadcaster.js';

// Inside start() method
if (process.env.TWITTER_RTMP_URL && process.env.TWITTER_STREAM_KEY) {
  const twitterBroadcaster = TwitterBroadcaster.getInstance();
  await twitterBroadcaster.configure(
    process.env.TWITTER_RTMP_URL,
    process.env.TWITTER_STREAM_KEY
  );
  
  const success = await twitterBroadcaster.addToEncoder(this.encoder!);
  if (success) {
    logger.info('Twitter broadcast started');
  }
}
```

## Stream Requirements

Twitter requires the following stream parameters:

- **Resolution**: 1280x720 (recommended)
- **Bitrate**: 2500-4000 Kbps
- **Framerate**: 30 fps
- **Video Codec**: H.264
- **Audio Codec**: AAC
- **Audio Bitrate**: 128 Kbps (minimum)

These settings are already configured properly in the Stream Manager.

## Monitoring & Error Handling

To properly handle stream health:

1. Monitor stream health metrics from Twitter
2. Implement error handling for RTMP connection failures
3. Set up automatic reconnection on stream failures

## Testing Twitter Integration

1. Start the Stream Manager: `docker-compose up stream-manager`
2. Configure with valid Twitter RTMP credentials
3. Check the logs to see if the connection is established
4. Verify the stream is visible on Twitter

## Security Notes

- Never commit Twitter stream keys to version control
- Rotate stream keys regularly
- Use environment variables for all sensitive credentials

## Architecture Integration

The Twitter RTMP broadcasting is one of several potential outputs from the Stream Manager:

- **RTMP Server**: Internal streaming (preview/monitoring)
- **Twitter**: Live broadcast to Twitter
- **Custom RTMP**: Any other RTMP destination
- **File Output**: Recording to disk

Each of these output destinations can be enabled or disabled without affecting the others. 