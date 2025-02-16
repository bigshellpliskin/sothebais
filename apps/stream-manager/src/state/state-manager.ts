import type { 
  StateManager,
  AppState
} from '../types/state-manager.js';
import type { StreamState } from '../types/stream.js';
import type { SceneState } from '../types/scene.js';
import { EventType, EventSource } from '../types/events.js';
import type { 
  StreamEvent, 
  SceneEvent,
  StreamManagerEvent,
  EventListener as StreamManagerEventListener 
} from '../types/events.js';
import { RedisService } from './redis-service.js';
import { logger } from '../utils/logger.js';
import { webSocketService } from '../server/websocket.js';
import { eventEmitter } from './event-emitter.js';
import type { Config } from '../types/config.js';

const DEFAULT_STREAM_STATE: StreamState = {
  isLive: false,
  isPaused: false,
  fps: 0,
  targetFPS: 30,
  frameCount: 0,
  droppedFrames: 0,
  averageRenderTime: 0,
  startTime: null,
  error: null
};

const DEFAULT_SCENE_STATE: SceneState = {
  background: [],
  quadrants: new Map(),
  overlay: []
};

export class StateManagerImpl implements StateManager {
  private state: AppState;
  private static instance: StateManagerImpl | null = null;
  private isInitialized: boolean = false;
  private redisService: RedisService;

  private constructor() {
    this.state = {
      stream: { ...DEFAULT_STREAM_STATE },
      scene: { ...DEFAULT_SCENE_STATE }
    };
    this.redisService = RedisService.getInstance();
  }

  public static getInstance(): StateManagerImpl {
    if (!StateManagerImpl.instance) {
      StateManagerImpl.instance = new StateManagerImpl();
    }
    return StateManagerImpl.instance;
  }

  public async initialize(config: Config): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize Redis service first
      logger.info('Initializing Redis service...');
      await this.redisService.initialize(config);

      // Initialize WebSocket service
      logger.info('Initializing WebSocket service...');
      await webSocketService.initialize();

      // Load initial state
      await this.loadState();
      
      this.isInitialized = true;
      logger.info('State manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize state manager', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  // State getters
  public getStreamState(): StreamState {
    return { ...this.state.stream };
  }

  public getSceneState(): SceneState {
    return {
      background: [...this.state.scene.background],
      quadrants: new Map(this.state.scene.quadrants),
      overlay: [...this.state.scene.overlay]
    };
  }

  // State updates
  private async ensureRedisConnection(): Promise<void> {
    if (!this.redisService.isReady()) {
      logger.info('Redis disconnected, attempting to reconnect...');
      await this.redisService.connect();
    }
  }

  public async updateStreamState(update: Partial<StreamState>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('State manager not initialized');
    }

    try {
      const previousState = { ...this.state.stream };
      const changes = Object.keys(update);

      logger.info('Updating stream state:', { 
        current: previousState,
        update,
        changes
      });

      this.state.stream = {
        ...this.state.stream,
        ...update
      };

      await this.ensureRedisConnection();
      await this.redisService.saveStreamState(this.state.stream);

      const event: StreamEvent = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: EventType.STATE_STREAM_UPDATE,
        source: EventSource.STATE_MANAGER,
        payload: {
          previous: previousState,
          current: this.state.stream,
          changes
        }
      };

      await eventEmitter.emit(event);
      webSocketService.broadcastStateUpdate(event);

      logger.info('Stream state updated and persisted:', {
        newState: this.state.stream,
        changes,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to update stream state', {
        error: error instanceof Error ? error.message : 'Unknown error',
        update,
        currentState: this.state.stream
      });
      throw error;
    }
  }

  public async updateSceneState(update: Partial<SceneState>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('State manager not initialized');
    }

    try {
      const previousState = this.getSceneState();
      const changes = Object.keys(update);

      // Log state change details
      logger.info('Updating scene state:', {
        current: previousState,
        update,
        changes
      });

      // Update in-memory state
      this.state.scene = {
        ...this.state.scene,
        ...update
      };

      await this.ensureRedisConnection();
      await this.redisService.saveSceneState(this.state.scene);

      // Create standardized event
      const event: SceneEvent = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: EventType.STATE_SCENE_UPDATE,
        source: EventSource.STATE_MANAGER,
        payload: {
          previous: previousState,
          current: this.getSceneState(),
          changes
        }
      };

      // Emit event
      await eventEmitter.emit(event);

      // Broadcast via WebSocket
      webSocketService.broadcastStateUpdate(event);

      logger.info('Scene state updated and persisted:', {
        newState: this.state.scene,
        changes,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to update scene state', {
        error: error instanceof Error ? error.message : 'Unknown error',
        update,
        currentState: this.state.scene
      });
      throw error;
    }
  }

  // Persistence
  public async loadState(): Promise<void> {
    if (!this.redisService.isReady()) {
      throw new Error('Redis client not connected');
    }

    try {
      // Load stream state from Redis
      const streamState = await this.redisService.getStreamState();
      const sceneState = await this.redisService.getSceneState();

      if (streamState) {
        this.state.stream = streamState;
        logger.info('Loaded stream state from Redis', { state: streamState });
      } else {
        this.state.stream = { ...DEFAULT_STREAM_STATE };
        await this.redisService.saveStreamState(this.state.stream);
        logger.info('Initialized default stream state', { state: this.state.stream });
      }

      if (sceneState) {
        this.state.scene = sceneState;
        logger.info('Loaded scene state from Redis', { state: sceneState });
      } else {
        this.state.scene = { ...DEFAULT_SCENE_STATE };
        await this.redisService.saveSceneState(this.state.scene);
        logger.info('Initialized default scene state', { state: this.state.scene });
      }
    } catch (error) {
      logger.error('Failed to load state from Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  public async saveState(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('State manager not initialized');
    }

    try {
      // Ensure Redis is connected
      await this.ensureRedisConnection();

      // Save both states
      await Promise.all([
        this.redisService.saveStreamState(this.state.stream),
        this.redisService.saveSceneState(this.state.scene)
      ]);

      logger.info('State saved to Redis', {
        stream: this.state.stream,
        scene: this.state.scene
      });
    } catch (error) {
      logger.error('Failed to save state to Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  // Event handling methods that delegate to eventEmitter
  public on(type: EventType, listener: StreamManagerEventListener): void {
    eventEmitter.on(type, listener);
  }

  public off(type: EventType, listener: StreamManagerEventListener): void {
    eventEmitter.off(type, listener);
  }

  public once(type: EventType, listener: StreamManagerEventListener): void {
    eventEmitter.once(type, listener);
  }
}

export const stateManager = StateManagerImpl.getInstance(); 