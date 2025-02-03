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

type LayerTypeContent = {
  'host': { character: VTuberCharacter };
  'assistant': { character: VTuberCharacter };
  'visualFeed': { content: NFTContent };
  'overlay': { content: OverlayContent };
  'chat': { content: { messages: ChatMessage[]; maxMessages: number; style: Record<string, unknown> } };
}

class LayerManager extends EventEmitter {
  private layers: Map<string, Layer> = new Map();
  private static instance: LayerManager;
  private initialized = false;
  private activeLayerId: string | null = null;

  public emit<K extends keyof LayerManagerEvents>(event: K, ...args: Parameters<LayerManagerEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  public on<K extends keyof LayerManagerEvents>(event: K, listener: LayerManagerEvents[K]): this {
    return super.on(event, listener);
  }

  private constructor() {
    super();
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

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Restore state from Redis
      const savedState = await redisService.getLayerState();
      if (savedState) {
        const { layers, activeLayerId } = savedState;
        layers.forEach((layer: Layer) => this.layers.set(layer.id, layer));
        this.activeLayerId = activeLayerId;
        logger.info('Restored layers from Redis', {
          layerCount: layers.length,
          activeLayerId
        } as LogContext);
      }

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize LayerManager', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      } as LogContext);
      throw error;
    }
  }

  public async createLayer<T extends keyof LayerTypeToInterface>(
    type: T,
    content: LayerTypeContent[T],
    options: Partial<BaseLayer> = {}
  ): Promise<LayerTypeToInterface[T]> {
    const id = options.id || uuidv4();
    const baseLayer: BaseLayer = {
      id,
      type,
      zIndex: options.zIndex || this.getNextZIndex(),
      visible: options.visible ?? true,
      opacity: options.opacity ?? 1,
      transform: options.transform || {
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        anchor: { x: 0.5, y: 0.5 }
      }
    };

    const layer = {
      ...baseLayer,
      ...content
    } as LayerTypeToInterface[T];

    this.layers.set(id, layer);
    this.emit('layer:created', layer);
    logger.debug('Layer created', {
      layerId: id
    } as LogContext);
    logger.info('Layer saved', {
      layerId: id
    } as LogContext);
    logger.info('Layer activated', {
      layerId: id
    } as LogContext);
    logger.info('Layer manager state updated', {
      layerCount: this.layers.size,
      activeLayerId: this.activeLayerId
    } as LogContext);
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

  public async updateLayer<T extends keyof LayerTypeToInterface>(
    id: string, 
    updates: Partial<LayerTypeToInterface[T]>
  ): Promise<LayerTypeToInterface[T] | undefined> {
    const existingLayer = this.layers.get(id);
    if (!existingLayer) {
      logger.warn('Attempted to update non-existent layer', {
        layerId: id
      } as LogContext);
      return undefined;
    }

    const layer = existingLayer as LayerTypeToInterface[T];
    const updatedLayer = { ...layer, ...updates };
    this.layers.set(id, updatedLayer);
    this.emit('layer:updated', updatedLayer);
    logger.info('Layer updated', {
      layerId: id
    } as LogContext);
    logger.info('Layer manager state updated', {
      layerCount: this.layers.size,
      activeLayerId: this.activeLayerId
    } as LogContext);
    return updatedLayer;
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
      layer.visible = visible;
      this.layers.set(id, layer);
      this.emit('layer:visibility', id, visible);
      this.emit('layer:updated', layer);
      logger.info('Layer visibility changed', {
        layerId: id,
        visible
      } as LogContext);
      logger.info('Layer manager state updated', {
        layerCount: this.layers.size,
        activeLayerId: this.activeLayerId
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

  private async persistState(): Promise<void> {
    try {
      const state: LayerState = {
        layers: Array.from(this.layers.values()),
        activeLayerId: this.activeLayerId
      };
      await redisService.saveLayerState(state);
      logger.debug('Layer state saved to Redis', {
        layerCount: state.layers.length,
        activeLayerId: state.activeLayerId
      } as LogContext);
      logger.info('Layer manager state updated', {
        layerCount: this.layers.size,
        activeLayerId: this.activeLayerId
      } as LogContext);
    } catch (error) {
      logger.error('Failed to persist layer state to Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      } as LogContext);
    }
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
