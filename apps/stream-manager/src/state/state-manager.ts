import type { 
  StateManager,
  PreviewClientState,
  StateEventListener,
  StateUpdateEvent,
  AppState
} from '../types/state-manager.js';
import type { LayerState } from '../types/layers.js';
import type { StreamState } from '../types/stream.js';
import { redisService } from './redis-service.js';
import { logger } from '../utils/logger.js';
import { webSocketService } from '../server/websocket.js';

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
  private listeners: Set<StateEventListener>;
  private saveTimeout: NodeJS.Timeout | null = null;
  private static instance: StateManagerImpl | null = null;

  private constructor() {
    this.state = {
      stream: { ...DEFAULT_STREAM_STATE },
      layers: { ...DEFAULT_LAYER_STATE },
      previewClients: {}
    };
    this.listeners = new Set();
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
      // Log state change details
      logger.info('Updating stream state:', { 
        current: this.state.stream,
        update,
        changedFields: Object.keys(update)
      });

      // Update in-memory state
      this.state.stream = {
        ...this.state.stream,
        ...update
      };

      // Save immediately to Redis
      await redisService.saveStreamState(this.state.stream);

      // Broadcast via WebSocket
      webSocketService.broadcastStateUpdate(this.state.stream);

      logger.info('Stream state updated and persisted:', {
        newState: this.state.stream,
        changedFields: Object.keys(update),
        timestamp: new Date().toISOString()
      });

      // Notify listeners
      this.notifyListeners({
        type: 'stream',
        payload: this.state.stream
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
    this.state.layers = {
      ...this.state.layers,
      ...update
    };

    this.notifyListeners({
      type: 'layers',
      payload: this.state.layers
    });

    await this.scheduleSave();
  }

  public async updatePreviewClient(clientId: string, update: Partial<PreviewClientState>): Promise<void> {
    const currentClient = this.state.previewClients[clientId] || {
      id: clientId,
      quality: 'medium',
      lastPing: Date.now(),
      connected: true
    };

    this.state.previewClients[clientId] = {
      ...currentClient,
      ...update
    };

    this.notifyListeners({
      type: 'previewClient',
      payload: this.state.previewClients[clientId]
    });
  }

  // Event handling
  public addEventListener(listener: StateEventListener): void {
    this.listeners.add(listener);
  }

  public removeEventListener(listener: StateEventListener): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(event: StateUpdateEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('Error in state update listener', {
          error: error instanceof Error ? error.message : 'Unknown error',
          event
        });
      }
    });
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

  private async scheduleSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Debounce saves to prevent too frequent Redis writes
    this.saveTimeout = setTimeout(async () => {
      try {
        await this.saveState();
      } catch (error) {
        logger.error('Scheduled state save failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }, 1000);
  }
}

export const stateManager = StateManagerImpl.getInstance(); 