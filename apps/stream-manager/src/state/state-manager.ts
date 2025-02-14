import type { 
  StateManager,
  PreviewClientState,
  AppState
} from '../types/state-manager.js';
import type { LayerState } from '../types/layers.js';
import type { StreamState } from '../types/stream.js';
import { EventType, EventSource } from '../types/events.js';
import type { 
  StreamEvent, 
  LayerEvent, 
  PreviewEvent,
  StreamManagerEvent,
  EventListener as StreamManagerEventListener 
} from '../types/events.js';
import { redisService } from './redis-service.js';
import { logger } from '../utils/logger.js';
import { webSocketService } from '../server/websocket.js';
import { eventEmitter } from './event-emitter.js';

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

const DEFAULT_LAYER_STATE: LayerState = {
  layers: [],
  activeLayerId: null
};

export class StateManagerImpl implements StateManager {
  private state: AppState;
  private static instance: StateManagerImpl | null = null;

  private constructor() {
    this.state = {
      stream: { ...DEFAULT_STREAM_STATE },
      layers: { ...DEFAULT_LAYER_STATE },
      previewClients: {}
    };
  }

  public static getInstance(): StateManagerImpl {
    if (!StateManagerImpl.instance) {
      StateManagerImpl.instance = new StateManagerImpl();
    }
    return StateManagerImpl.instance;
  }

  // State getters
  public getStreamState(): StreamState {
    return { ...this.state.stream };
  }

  public getLayerState(): LayerState {
    return { ...this.state.layers };
  }

  public getPreviewClients(): Record<string, PreviewClientState> {
    return { ...this.state.previewClients };
  }

  // State updates
  public async updateStreamState(update: Partial<StreamState>): Promise<void> {
    try {
      const previousState = { ...this.state.stream };
      const changes = Object.keys(update);

      // Log state change details
      logger.info('Updating stream state:', { 
        current: previousState,
        update,
        changes
      });

      // Update in-memory state
      this.state.stream = {
        ...this.state.stream,
        ...update
      };

      // Save immediately to Redis
      await redisService.saveStreamState(this.state.stream);

      // Create standardized event
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

      // Emit event
      await eventEmitter.emit(event);

      // Broadcast via WebSocket
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

  public async updateLayerState(update: Partial<LayerState>): Promise<void> {
    try {
      const previousState = { ...this.state.layers };
      const changes = Object.keys(update);

      // Log state change details
      logger.info('Updating layer state:', {
        current: previousState,
        update,
        changes
      });

      // Update in-memory state
      this.state.layers = {
        ...this.state.layers,
        ...update
      };

      // Save immediately to Redis
      await redisService.saveLayerState(this.state.layers);

      // Create standardized event
      const event: LayerEvent = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: EventType.STATE_LAYER_UPDATE,
        source: EventSource.STATE_MANAGER,
        payload: {
          previous: previousState,
          current: this.state.layers,
          changes
        }
      };

      // Emit event
      await eventEmitter.emit(event);

      // Broadcast via WebSocket
      webSocketService.broadcastStateUpdate(event);

      logger.info('Layer state updated and persisted:', {
        newState: this.state.layers,
        changes,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to update layer state', {
        error: error instanceof Error ? error.message : 'Unknown error',
        update,
        currentState: this.state.layers
      });
      throw error;
    }
  }

  public async updatePreviewClient(clientId: string, update: Partial<PreviewClientState>): Promise<void> {
    const previousState = this.state.previewClients[clientId] || {
      id: clientId,
      quality: 'medium',
      lastPing: Date.now(),
      connected: true
    };

    const changes = Object.keys(update);

    this.state.previewClients[clientId] = {
      ...previousState,
      ...update
    };

    // Create standardized event
    const event: PreviewEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: EventType.STATE_PREVIEW_UPDATE,
      source: EventSource.STATE_MANAGER,
      payload: {
        clientId,
        previous: previousState,
        current: this.state.previewClients[clientId],
        changes
      }
    };

    // Emit event
    await eventEmitter.emit(event);
  }

  // Persistence
  public async loadState(): Promise<void> {
    try {
      // Load stream state from Redis
      const streamState = await redisService.getStreamState();

      if (streamState) {
        this.state.stream = streamState;
        logger.info('Loaded stream state from Redis', { state: streamState });
      } else if (streamState === null) {
          // Explicitly check for null, which indicates either no state or an error
          const redisState = await redisService.client?.get('streamState');
          if (redisState === null || redisState === undefined) {
              // Key does not exist in Redis, initialize default state
              this.state.stream = { ...DEFAULT_STREAM_STATE };
              await redisService.saveStreamState(this.state.stream);
              logger.info('Initialized default stream state', { state: this.state.stream });
          } else {
              // Key exists, but there was an error parsing. Log and keep in-memory default, but don't overwrite Redis
              logger.warn('Failed to load or parse stream state from Redis. Using in-memory default.');
              this.state.stream = { ...DEFAULT_STREAM_STATE }; // Use default, but don't save
          }
      }

      // Load layer state from Redis (similar handling)
      const layerState = await redisService.getLayerState();
      if (layerState) {
        this.state.layers = layerState;
        logger.info('Loaded layer state from Redis', { state: layerState });
      }
    } catch (error) {
      logger.error('Failed to load state from Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error; // Re-throw the error to be handled upstream
    }
  }

  public async saveState(): Promise<void> {
    try {
      // Ensure Redis is connected
      if (!redisService.isReady()) {
        logger.info('Redis not connected, attempting to reconnect');
        await redisService.connect();
      }

      // Save both stream and layer state
      await Promise.all([
        redisService.saveStreamState(this.state.stream),
        redisService.saveLayerState(this.state.layers)
      ]);

      logger.info('State saved to Redis', {
        stream: this.state.stream,
        layers: this.state.layers
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