import { logger } from '../../utils/logger.js';
import type { RTMPServer } from './server.js';
import { Counter } from 'prom-client';

// Define metrics
const connectionCounter = new Counter({
  name: 'rtmp_connection_attempts_total',
  help: 'Total number of RTMP connection attempts',
  labelNames: ['status']
});

const publishCounter = new Counter({
  name: 'rtmp_publish_attempts_total',
  help: 'Total number of RTMP publish attempts',
  labelNames: ['status']
});

export class RTMPEvents {
  private server: RTMPServer;

  constructor(server: RTMPServer) {
    this.server = server;
  }

  // Connection Events
  public async handlePreConnect(id: string, args: any): Promise<void> {
    connectionCounter.labels('attempt').inc();
    logger.info('RTMP pre-connect', {
      id,
      ip: args.ip
    });
  }

  public async handlePostConnect(id: string, args: any): Promise<void> {
    connectionCounter.labels('success').inc();
    logger.info('RTMP connected', {
      id,
      ip: args.ip
    });
  }

  public async handleDoneConnect(id: string, args: any): Promise<void> {
    logger.info('RTMP disconnected', {
      id,
      ip: args.ip
    });
  }

  // Publishing Events
  public async handlePrePublish(id: string, streamPath: string, args: any): Promise<void> {
    publishCounter.labels('attempt').inc();
    
    // Extract stream key from path
    const streamKey = this.extractStreamKey(streamPath);
    
    // Validate stream key
    if (!this.server.validateStreamKey(streamKey)) {
      logger.warn('Invalid stream key', {
        id,
        streamPath,
        streamKey
      });
      return;
    }

    logger.info('RTMP pre-publish', {
      id,
      streamPath,
      streamKey
    });
  }

  public async handlePostPublish(id: string, streamPath: string, args: any): Promise<void> {
    publishCounter.labels('success').inc();
    logger.info('RTMP stream started', {
      id,
      streamPath
    });
  }

  public async handleDonePublish(id: string, streamPath: string, args: any): Promise<void> {
    logger.info('RTMP stream ended', {
      id,
      streamPath
    });
  }

  // Error Handling
  public async handleError(error: Error): Promise<void> {
    logger.error('RTMP server error', {
      error: error.message,
      stack: error.stack
    });
  }

  // Helper Methods
  private extractStreamKey(streamPath: string): string {
    // Expected format: /live/stream-key
    const parts = streamPath.split('/');
    return parts[parts.length - 1] || '';
  }
}
