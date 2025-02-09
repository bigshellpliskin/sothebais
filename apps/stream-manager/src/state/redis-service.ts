import { createClient } from 'redis';
import type { LayerState } from '../types/layers.js';
import type { StreamState } from '../types/stream.js';
import type { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { LogContext } from '../utils/logger.js';
import type { RedisClientType, RedisClientOptions } from 'redis';

/**
 * Type guard for StreamState
 */
function isStreamState(obj: unknown): obj is StreamState {
  if (!obj || typeof obj !== 'object') return false;
  const state = obj as Partial<StreamState>;
  return (
    typeof state.isLive === 'boolean' &&
    typeof state.isPaused === 'boolean' &&
    typeof state.fps === 'number' &&
    typeof state.targetFPS === 'number' &&
    typeof state.frameCount === 'number' &&
    typeof state.droppedFrames === 'number' &&
    typeof state.averageRenderTime === 'number'
  );
}

/**
 * Type guard for LayerState
 */
function isLayerState(obj: unknown): obj is LayerState {
  if (!obj || typeof obj !== 'object') return false;
  const state = obj as Partial<LayerState>;
  return (
    Array.isArray(state.layers) &&
    (state.activeLayerId === null || typeof state.activeLayerId === 'string')
  );
}

class RedisService {
  public client: RedisClientType | null = null;
  private isConnected = false;

  async initialize(config: Config): Promise<void> {
    if (this.client) {
      return;
    }

    const clientOptions: RedisClientOptions = {
      url: config.REDIS_URL,
      password: config.REDIS_PASSWORD
    };

    this.client = createClient(clientOptions) as RedisClientType;

    this.client.on('error', (err) => {
      this.isConnected = false;
      logger.error('Redis client error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      } as LogContext);
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connection established', {
        host: config.REDIS_URL,
        status: 'connected'
      });
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.info('Redis connection closed');
    });

    // Connect immediately after initialization
    await this.connect();
  }

  async connect(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis service not initialized. Call initialize() first.');
    }
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected && this.client) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  async saveLayerState(state: LayerState): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not connected');
    }
    await this.client.set('layerState', JSON.stringify(state));
  }

  async saveStreamState(state: StreamState): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not connected');
    }
    await this.client.set('streamState', JSON.stringify(state));
  }

  async getStreamState(): Promise<StreamState | null> {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not connected');
    }
    const state = await this.client.get('streamState');
    if (!state) return null;

    try {
      const parsed = JSON.parse(state);
      if (!isStreamState(parsed)) {
        logger.error('Invalid stream state format in Redis', { state: parsed });
        return null;
      }
      return parsed;
    } catch (error) {
      logger.error('Failed to parse stream state from Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        raw: state
      });
      return null;
    }
  }

  async getLayerState(): Promise<LayerState | null> {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not connected');
    }
    const state = await this.client.get('layerState');
    if (!state) return null;

    try {
      const parsed = JSON.parse(state);
      if (!isLayerState(parsed)) {
        logger.error('Invalid layer state format in Redis', { state: parsed });
        return null;
      }
      return parsed;
    } catch (error) {
      logger.error('Failed to parse layer state from Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        raw: state
      });
      return null;
    }
  }

  async clearLayerState(): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not connected');
    }
    await this.client.del('layerState');
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }
}

export const redisService = new RedisService(); 