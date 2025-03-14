import { logger } from '../../utils/logger.js';
import { StreamEncoder } from './encoder.js';

/**
 * Twitter Broadcaster
 * 
 * Utility to configure Twitter RTMP broadcasting
 */
export class TwitterBroadcaster {
  private static instance: TwitterBroadcaster | null = null;
  private isConfigured: boolean = false;
  private streamKey: string | null = null;
  private rtmpUrl: string | null = null;
  
  private constructor() {}
  
  public static getInstance(): TwitterBroadcaster {
    if (!TwitterBroadcaster.instance) {
      TwitterBroadcaster.instance = new TwitterBroadcaster();
    }
    return TwitterBroadcaster.instance;
  }
  
  /**
   * Configure Twitter streaming settings
   */
  public configure(rtmpUrl: string, streamKey: string): void {
    this.rtmpUrl = rtmpUrl;
    this.streamKey = streamKey;
    this.isConfigured = true;
    
    logger.info('Twitter broadcaster configured', { 
      rtmpUrl,
      isConfigured: this.isConfigured
    });
  }
  
  /**
   * Get the full Twitter RTMP endpoint
   */
  public getTwitterEndpoint(): string | null {
    if (!this.isConfigured || !this.rtmpUrl || !this.streamKey) {
      return null;
    }
    
    return `${this.rtmpUrl}/${this.streamKey}`;
  }
  
  /**
   * Check if Twitter broadcasting is configured
   */
  public isReady(): boolean {
    return this.isConfigured;
  }
  
  /**
   * Get the Twitter RTMP URL
   */
  public getRtmpUrl(): string | null {
    return this.rtmpUrl;
  }
  
  /**
   * Get the Twitter stream key
   */
  public getStreamKey(): string | null {
    return this.streamKey;
  }
} 