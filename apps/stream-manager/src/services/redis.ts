import { createClient } from 'redis';
import { LayerState } from '../types/layers';
import { Config } from '../config';
import { logger } from '../utils/logger';

class RedisService {
  private client!: ReturnType<typeof createClient>;
  private isConnected = false;

  constructor() {}

  initialize(config: Config) {
    this.client = createClient({
      url: config.REDIS_URL,
      password: config.REDIS_PASSWORD
    });

    this.client.on('error', (err: Error) => {
      logger.error({ error: err.message }, 'Redis client error');
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info({ event: 'redis_connected' }, 'Redis client connected');
      this.isConnected = true;
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