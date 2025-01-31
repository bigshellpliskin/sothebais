import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
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
      logger.info({ layerId: layer.id, type: layer.type }, 'Layer created');
      this.persistState();
    });

    this.on('layer:updated', (layer: Layer) => {
      logger.info({ layerId: layer.id }, 'Layer updated');
      this.persistState();
    });

    this.on('layer:deleted', (layerId: string) => {
      logger.info({ layerId }, 'Layer deleted');
      if (this.activeLayerId === layerId) {
        this.setActiveLayer(null);
      }
      this.persistState();
    });

    this.on('layer:active', (layerId: string | null) => {
      logger.info({ layerId }, 'Active layer changed');
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
        logger.info({ layerCount: layers.length, activeLayerId }, 'Restored layers from Redis');
      }

      this.initialized = true;
    } catch (error) {
      logger.error({ error }, 'Failed to initialize LayerManager');
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
      logger.warn({ layerId: id }, 'Attempted to update non-existent layer');
      return undefined;
    }

    const layer = existingLayer as LayerTypeToInterface[T];
    const updatedLayer = { ...layer, ...updates };
    this.layers.set(id, updatedLayer);
    this.emit('layer:updated', updatedLayer);
    return updatedLayer;
  }

  public async deleteLayer(id: string): Promise<boolean> {
    const deleted = this.layers.delete(id);
    if (deleted) {
      this.emit('layer:deleted', id);
    }
    return deleted;
  }

  public setLayerVisibility(id: string, visible: boolean): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.visible = visible;
      this.layers.set(id, layer);
      this.emit('layer:visibility', id, visible);
      this.emit('layer:updated', layer);
    }
  }

  public setLayerTransform(id: string, transform: Partial<Transform>): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.transform = { ...layer.transform, ...transform };
      this.layers.set(id, layer);
      this.emit('layer:transform', id, layer.transform);
      this.emit('layer:updated', layer);
    }
  }

  public setLayerZIndex(id: string, zIndex: number): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.zIndex = zIndex;
      this.layers.set(id, layer);
      this.emit('layer:zindex', id, zIndex);
      this.emit('layer:updated', layer);
    }
  }

  public setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
      this.layers.set(id, layer);
      this.emit('layer:opacity', id, layer.opacity);
      this.emit('layer:updated', layer);
    }
  }

  public setActiveLayer(id: string | null): void {
    this.activeLayerId = id;
    this.emit('layer:active', id);
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
      logger.debug({ layerCount: state.layers.length, activeLayerId: state.activeLayerId }, 'Persisted layer state to Redis');
    } catch (error) {
      logger.error({ error }, 'Failed to persist layer state to Redis');
    }
  }

  public async clearAllLayers(): Promise<void> {
    this.layers.clear();
    this.activeLayerId = null;
    await redisService.clearLayerState();
    logger.info('Cleared all layers');
  }
}

export const layerManager = LayerManager.getInstance(); 
