import { createClient } from 'redis';
import type { LayerState } from '../types/layers.js';
import type { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { LogContext } from '../utils/logger.js';
import type { RedisClientType, RedisClientOptions } from 'redis';

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  initialize(config: Config): void {
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
    });

    this.client.on('end', () => {
      this.isConnected = false;
    });
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
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  async saveLayerState(state: LayerState): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }
    await this.client.set('layerState', JSON.stringify(state));
  }

  async getLayerState(): Promise<LayerState | null> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }
    const state = await this.client.get('layerState');
    return state ? JSON.parse(state) : null;
  }

  async clearLayerState(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }
    await this.client.del('layerState');
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

export const redisService = new RedisService(); 