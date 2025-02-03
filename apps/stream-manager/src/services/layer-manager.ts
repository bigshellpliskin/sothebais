import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { LogContext } from '../utils/logger.js';
import { redisService } from './redis.js';
import type { 
  Layer, 
  BaseLayer, 
  LayerType, 
  Transform, 
  LayerState,
  HostLayer,
  AssistantLayer,
  VisualFeedLayer,
  OverlayLayer,
  VTuberCharacter,
  NFTContent,
  OverlayContent,
  ChatLayer,
  ChatMessage
} from '../types/layers.js';

interface LayerManagerEvents {
  'layer:created': (layer: Layer) => void;
  'layer:updated': (layer: Layer) => void;
  'layer:deleted': (layerId: string) => void;
  'layer:visibility': (layerId: string, visible: boolean) => void;
  'layer:transform': (layerId: string, transform: Transform) => void;
  'layer:zindex': (layerId: string, zIndex: number) => void;
  'layer:opacity': (layerId: string, opacity: number) => void;
  'layer:active': (layerId: string | null) => void;
}

type LayerTypeToInterface = {
  'host': HostLayer;
  'assistant': AssistantLayer;
  'visualFeed': VisualFeedLayer;
  'overlay': OverlayLayer;
  'chat': ChatLayer;
}

const LAYER_STATE_KEY = 'layer_state';

type LayerContent<T extends LayerType> = T extends 'host' | 'assistant'
  ? { character: VTuberCharacter }
  : T extends 'visualFeed'
  ? { content: NFTContent }
  : T extends 'overlay'
  ? { content: OverlayContent }
  : T extends 'chat'
  ? { content: ChatLayer['content'] }
  : never;

type LayerTypeMap = {
  'host': HostLayer;
  'assistant': AssistantLayer;
  'visualFeed': VisualFeedLayer;
  'overlay': OverlayLayer;
  'chat': ChatLayer;
};

class LayerManager extends EventEmitter {
  private layers: Map<string, Layer> = new Map();
  private static instance: LayerManager;
  private initialized = false;
  private activeLayerId: string | null = null;
  private redis: typeof redisService;

  public emit<K extends keyof LayerManagerEvents>(event: K, ...args: Parameters<LayerManagerEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  public on<K extends keyof LayerManagerEvents>(event: K, listener: LayerManagerEvents[K]): this {
    return super.on(event, listener);
  }

  private constructor() {
    super();
    this.redis = redisService;
    this.setupEventHandlers();
  }

  public static getInstance(): LayerManager {
    if (!LayerManager.instance) {
      LayerManager.instance = new LayerManager();
    }
    return LayerManager.instance;
  }

  private setupEventHandlers(): void {
    this.on('layer:created', (layer: Layer) => {
      logger.info('Layer created', {
        layerId: layer.id,
        type: layer.type
      } as LogContext);
      this.persistState();
    });

    this.on('layer:updated', (layer: Layer) => {
      logger.info('Layer updated', {
        layerId: layer.id
      } as LogContext);
      this.persistState();
    });

    this.on('layer:deleted', (layerId: string) => {
      logger.info('Layer deleted', {
        layerId
      } as LogContext);
      if (this.activeLayerId === layerId) {
        this.setActiveLayer(null);
      }
      this.persistState();
    });

    this.on('layer:active', (layerId: string | null) => {
      logger.info('Active layer changed', {
        layerId
      } as LogContext);
      this.persistState();
    });
  }

  private async loadState(): Promise<LayerState | null> {
    const savedState = await this.redis.getLayerState();
    return savedState;
  }

  public async initialize(): Promise<void> {
    try {
      // Clear any existing state
      await this.clearAllLayers();

      // Restore state from Redis
      const state = await this.loadState();
      if (state) {
        this.layers = new Map(state.layers.map(layer => [layer.id, layer]));
        this.activeLayerId = state.activeLayerId;
        logger.info('Restored layers from Redis', {
          layerCount: state.layers.length,
          activeLayerId: state.activeLayerId
        } as LogContext);
      }
    } catch (error) {
      logger.error('Failed to initialize layer manager', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      } as LogContext);
      throw error;
    }
  }

  public async createLayer<T extends LayerType>(
    type: T,
    content: LayerContent<T>,
    options: Partial<Omit<Layer, 'id' | 'type' | 'content'>> = {}
  ): Promise<LayerTypeMap[T]> {
    // Check for duplicate layers first
    const existingLayer = Array.from(this.layers.values()).find(l => {
      if (l.type !== type) return false;
      
      // Compare content based on layer type
      switch (type) {
        case 'host':
        case 'assistant': {
          const existing = l as HostLayer | AssistantLayer;
          const newContent = content as { character: VTuberCharacter };
          return existing.character.modelUrl === newContent.character.modelUrl;
        }
        case 'visualFeed': {
          const existing = l as VisualFeedLayer;
          const newContent = content as { content: NFTContent };
          return existing.content.imageUrl === newContent.content.imageUrl;
        }
        case 'overlay': {
          const existing = l as OverlayLayer;
          const newContent = content as { content: OverlayContent };
          return existing.content.type === newContent.content.type &&
                 existing.content.content === newContent.content.content;
        }
        case 'chat': {
          const existing = l as ChatLayer;
          const newContent = content as { content: ChatLayer['content'] };
          return existing.content.maxMessages === newContent.content.maxMessages;
        }
      }
    });

    if (existingLayer) {
      logger.warn('Duplicate layer detected, returning existing layer', {
        type,
        existingId: existingLayer.id,
        layerCount: this.layers.size
      } as LogContext);
      return existingLayer as LayerTypeMap[T];
    }

    const id = uuidv4();
    const baseLayer = {
      id,
      type,
      visible: true,
      opacity: 1,
      zIndex: options.zIndex ?? this.getNextZIndex(),
      transform: options.transform ?? {
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        anchor: { x: 0, y: 0 }
      }
    };

    const layer = {
      ...baseLayer,
      ...(content as any)
    } as LayerTypeMap[T];

    this.layers.set(id, layer);
    this.emit('layer:created', layer);
    await this.persistState();

    return layer;
  }

  public getLayer<T extends keyof LayerTypeToInterface>(id: string): LayerTypeToInterface[T] | undefined {
    const layer = this.layers.get(id);
    if (!layer) return undefined;
    return layer as LayerTypeToInterface[T];
  }

  public getAllLayers(): Layer[] {
    return Array.from(this.layers.values())
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  public async updateLayer<T extends LayerType>(
    id: string,
    update: Partial<LayerTypeMap[T]>
  ): Promise<void> {
    const layer = this.layers.get(id) as LayerTypeMap[T];
    if (!layer) {
      throw new Error(`Layer not found: ${id}`);
    }

    // Update the layer
    Object.assign(layer, update);

    // Persist changes
    await this.persistState();
  }

  public async deleteLayer(id: string): Promise<boolean> {
    try {
      logger.info('Deleting layer', {
        layerId: id
      } as LogContext);

      const deleted = this.layers.delete(id);
      if (deleted) {
        this.emit('layer:deleted', id);
      }
      this.persistState();
      return deleted;
    } catch (error) {
      logger.error('Failed to delete layer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      } as LogContext);
      throw error;
    }
  }

  public setLayerVisibility(id: string, visible: boolean): void {
    const layer = this.layers.get(id);
    if (layer) {
      logger.info('Layer visibility change requested', {
        layerId: id,
        type: layer.type,
        currentVisibility: layer.visible,
        requestedVisibility: visible,
        layerCount: this.layers.size
      } as LogContext);

      if (layer.visible !== visible) {
        layer.visible = visible;
        this.layers.set(id, layer);
        
        this.emit('layer:visibility', id, visible);
        this.emit('layer:updated', layer);

        logger.info('Layer visibility changed', {
          layerId: id,
          type: layer.type,
          newVisibility: layer.visible,
          allLayers: Array.from(this.layers.values()).map(l => ({
            id: l.id,
            type: l.type,
            visible: l.visible
          }))
        } as LogContext);
      } else {
        logger.debug('Layer visibility unchanged', {
          layerId: id,
          type: layer.type,
          visible: visible
        } as LogContext);
      }
    } else {
      logger.warn('Attempted to change visibility of non-existent layer', {
        layerId: id
      } as LogContext);
    }
  }

  public setLayerTransform(id: string, transform: Partial<Transform>): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.transform = { ...layer.transform, ...transform };
      this.layers.set(id, layer);
      this.emit('layer:transform', id, layer.transform);
      this.emit('layer:updated', layer);
      logger.info('Layer transform changed', {
        layerId: id
      } as LogContext);
      logger.info('Layer manager state updated', {
        layerCount: this.layers.size,
        activeLayerId: this.activeLayerId
      } as LogContext);
    }
  }

  public setLayerZIndex(id: string, zIndex: number): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.zIndex = zIndex;
      this.layers.set(id, layer);
      this.emit('layer:zindex', id, zIndex);
      this.emit('layer:updated', layer);
      logger.info('Layer zIndex changed', {
        layerId: id,
        zIndex
      } as LogContext);
      logger.info('Layer manager state updated', {
        layerCount: this.layers.size,
        activeLayerId: this.activeLayerId
      } as LogContext);
    }
  }

  public setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
      this.layers.set(id, layer);
      this.emit('layer:opacity', id, layer.opacity);
      this.emit('layer:updated', layer);
      logger.info('Layer opacity changed', {
        layerId: id,
        opacity
      } as LogContext);
      logger.info('Layer manager state updated', {
        layerCount: this.layers.size,
        activeLayerId: this.activeLayerId
      } as LogContext);
    }
  }

  public setActiveLayer(id: string | null): void {
    this.activeLayerId = id;
    this.emit('layer:active', id);
    logger.info('Active layer changed', {
      layerId: id
    } as LogContext);
    logger.info('Layer manager state updated', {
      layerCount: this.layers.size,
      activeLayerId: this.activeLayerId
    } as LogContext);
  }

  public getActiveLayer(): Layer | undefined {
    return this.activeLayerId ? this.layers.get(this.activeLayerId) : undefined;
  }

  private getNextZIndex(): number {
    const layers = this.getAllLayers();
    return layers.length > 0 
      ? Math.max(...layers.map(l => l.zIndex)) + 1 
      : 0;
  }

  protected async persistState(): Promise<void> {
    try {
      const state: LayerState = {
        layers: this.getAllLayers(),
        activeLayerId: this.activeLayerId
      };

      await this.redis.saveLayerState(state);
    } catch (error) {
      logger.error('Failed to persist layer state', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      } as LogContext);
    }
  }

  public async saveState(): Promise<void> {
    await this.persistState();
  }

  public async clearAllLayers(): Promise<void> {
    this.layers.clear();
    this.activeLayerId = null;
    await redisService.clearLayerState();
    logger.info('Cleared all layers', {
      layerCount: this.layers.size
    } as LogContext);
    logger.info('Layer manager state updated', {
      layerCount: this.layers.size,
      activeLayerId: this.activeLayerId
    } as LogContext);
  }
}

export const layerManager = LayerManager.getInstance(); 
