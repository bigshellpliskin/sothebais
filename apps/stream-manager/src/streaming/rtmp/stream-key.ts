import { randomBytes, createHash } from 'crypto';
import { Redis } from 'ioredis';
import { logger } from '../../utils/logger.js';
import type { LogContext } from '../../utils/logger.js';

const STREAM_KEY_PREFIX = 'stream:key:';
const STREAM_KEY_LENGTH = 32;

export interface StreamKeyInfo {
  userId: string;
  streamId: string;
  expiresAt?: Date;
  allowedIps?: string[];
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

export class StreamKeyService {
  private static instance: StreamKeyService | null = null;
  private redis: Redis;

  private constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error', {
        error: error.message
      } as LogContext);
    });
  }

  public static initialize(redisUrl: string): StreamKeyService {
    if (!StreamKeyService.instance) {
      StreamKeyService.instance = new StreamKeyService(redisUrl);
    }
    return StreamKeyService.instance;
  }

  public static getInstance(): StreamKeyService {
    if (!StreamKeyService.instance) {
      throw new Error('StreamKeyService not initialized');
    }
    return StreamKeyService.instance;
  }

  /**
   * Generate a new stream key for a user
   */
  public async generateKey(userId: string, streamId: string, options: {
    expiresIn?: number; // Seconds
    allowedIps?: string[];
  } = {}): Promise<string> {
    const streamKey = randomBytes(STREAM_KEY_LENGTH).toString('hex');
    const hashedKey = this.hashKey(streamKey);
    
    const keyInfo: StreamKeyInfo = {
      userId,
      streamId,
      isActive: true,
      createdAt: new Date(),
      ...(options.expiresIn && { expiresAt: new Date(Date.now() + options.expiresIn * 1000) }),
      ...(options.allowedIps && { allowedIps: options.allowedIps })
    };

    await this.redis.set(
      STREAM_KEY_PREFIX + hashedKey,
      JSON.stringify(keyInfo),
      'EX',
      options.expiresIn || 86400 * 30 // Default to 30 days
    );

    logger.info('Stream key generated', {
      userId,
      streamId,
      expiresIn: options.expiresIn
    } as LogContext);

    return streamKey;
  }

  /**
   * Validate a stream key and update its last used timestamp
   */
  public async validateKey(streamKey: string, ip?: string): Promise<boolean> {
    try {
      const hashedKey = this.hashKey(streamKey);
      const keyData = await this.redis.get(STREAM_KEY_PREFIX + hashedKey);

      if (!keyData) {
        logger.warn('Invalid stream key', { streamKey } as LogContext);
        return false;
      }

      const keyInfo: StreamKeyInfo = JSON.parse(keyData);

      // Check if key is active
      if (!keyInfo.isActive) {
        logger.warn('Inactive stream key', { streamKey } as LogContext);
        return false;
      }

      // Check expiration
      if (keyInfo.expiresAt && new Date(keyInfo.expiresAt) < new Date()) {
        logger.warn('Expired stream key', { streamKey } as LogContext);
        return false;
      }

      // Check IP restrictions
      if (ip && keyInfo.allowedIps && !keyInfo.allowedIps.includes(ip)) {
        logger.warn('IP not allowed for stream key', {
          streamKey,
          ip,
          allowedIps: keyInfo.allowedIps
        } as LogContext);
        return false;
      }

      // Update last used timestamp
      keyInfo.lastUsedAt = new Date();
      await this.redis.set(
        STREAM_KEY_PREFIX + hashedKey,
        JSON.stringify(keyInfo),
        'KEEPTTL' // Preserve the original TTL
      );

      return true;
    } catch (error) {
      logger.error('Error validating stream key', {
        error: error instanceof Error ? error.message : 'Unknown error',
        streamKey
      } as LogContext);
      return false;
    }
  }

  /**
   * Revoke a stream key
   */
  public async revokeKey(streamKey: string): Promise<boolean> {
    try {
      const hashedKey = this.hashKey(streamKey);
      const keyData = await this.redis.get(STREAM_KEY_PREFIX + hashedKey);

      if (!keyData) {
        return false;
      }

      const keyInfo: StreamKeyInfo = JSON.parse(keyData);
      keyInfo.isActive = false;

      await this.redis.set(
        STREAM_KEY_PREFIX + hashedKey,
        JSON.stringify(keyInfo),
        'KEEPTTL'
      );

      logger.info('Stream key revoked', {
        userId: keyInfo.userId,
        streamId: keyInfo.streamId
      } as LogContext);

      return true;
    } catch (error) {
      logger.error('Error revoking stream key', {
        error: error instanceof Error ? error.message : 'Unknown error',
        streamKey
      } as LogContext);
      return false;
    }
  }

  /**
   * Get information about a stream key
   */
  public async getKeyInfo(streamKey: string): Promise<StreamKeyInfo | null> {
    try {
      const hashedKey = this.hashKey(streamKey);
      const keyData = await this.redis.get(STREAM_KEY_PREFIX + hashedKey);

      if (!keyData) {
        return null;
      }

      return JSON.parse(keyData) as StreamKeyInfo;
    } catch (error) {
      logger.error('Error getting stream key info', {
        error: error instanceof Error ? error.message : 'Unknown error',
        streamKey
      } as LogContext);
      return null;
    }
  }

  /**
   * Hash a stream key for storage
   */
  private hashKey(streamKey: string): string {
    return createHash('sha256').update(streamKey).digest('hex');
  }
} 