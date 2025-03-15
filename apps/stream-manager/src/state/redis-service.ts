import { createClient } from 'redis';
import type { StreamState, SceneState } from '@sothebais/shared/types/stream.js';
import type { Config } from '../types/index.js';
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
    typeof state.droppedFrames === 'number'
  );
}

/**
 * Type guard for SceneState
 */
function isSceneState(obj: unknown): obj is SceneState {
  if (!obj || typeof obj !== 'object') return false;
  const state = obj as Partial<SceneState>;
  return (
    Array.isArray(state.background) &&
    state.quadrants instanceof Map &&
    Array.isArray(state.overlay)
  );
}

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private static instance: RedisService | null = null;

  private constructor() {}

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

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

  async saveStreamState(state: StreamState): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not connected');
    }
    await this.client.set('streamState', JSON.stringify(state));
  }

  async saveSceneState(state: SceneState): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not connected');
    }
    // Convert Map to array of entries for JSON serialization
    const serializedState = {
      ...state,
      quadrants: Array.from(state.quadrants.entries())
    };
    await this.client.set('sceneState', JSON.stringify(serializedState));
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

  async getSceneState(): Promise<SceneState | null> {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not connected');
    }
    const state = await this.client.get('sceneState');
    if (!state) return null;

    try {
      const parsed = JSON.parse(state);
      // Convert array of entries back to Map
      const reconstructedState = {
        ...parsed,
        quadrants: new Map(parsed.quadrants)
      };
      if (!isSceneState(reconstructedState)) {
        logger.error('Invalid scene state format in Redis', { state: parsed });
        return null;
      }
      return reconstructedState;
    } catch (error) {
      logger.error('Failed to parse scene state from Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        raw: state
      });
      return null;
    }
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }
}

export { RedisService }; 