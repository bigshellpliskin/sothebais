import { EventEmitter } from 'events';
import type { Layer, Transform } from '../../types/layers.js';

// Define the interface to match the real LayerManager
interface LayerManager {
  getAllLayers(): Layer[];
  getLayer(id: string): Layer | undefined;
  createLayer(type: string, content: any, options?: any): Promise<Layer>;
  updateLayer(id: string, update: Partial<Layer>): Promise<void>;
  deleteLayer(id: string): Promise<boolean>;
  setLayerVisibility(id: string, visible: boolean): void;
  setLayerTransform(id: string, transform: Partial<Transform>): void;
  setLayerOpacity(id: string, opacity: number): void;
  initialize(): Promise<void>;
  clearAllLayers(): Promise<void>;
}

class MockLayerManager extends EventEmitter {
  private static instance: MockLayerManager;
  private layers: Map<string, Layer> = new Map();
  private activeLayerId: string | null = null;

  private constructor() {
    super();
  }

  static getInstance(): MockLayerManager {
    if (!MockLayerManager.instance) {
      MockLayerManager.instance = new MockLayerManager();
    }
    return MockLayerManager.instance;
  }

  getAllLayers(): Layer[] {
    return Array.from(this.layers.values())
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  getLayer(id: string): Layer | undefined {
    return this.layers.get(id);
  }

  async createLayer(type: string, content: any, options: any = {}): Promise<Layer> {
    const id = `mock-${Date.now()}`;
    const layer = {
      id,
      type,
      ...content,
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
    this.layers.set(id, layer);
    return layer;
  }

  async updateLayer(id: string, update: Partial<Layer>): Promise<void> {
    const layer = this.layers.get(id);
    if (layer) {
      Object.assign(layer, update);
    }
  }

  async deleteLayer(id: string): Promise<boolean> {
    return this.layers.delete(id);
  }

  setLayerVisibility(id: string, visible: boolean): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.visible = visible;
    }
  }

  setLayerTransform(id: string, transform: Partial<Transform>): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.transform = { ...layer.transform, ...transform };
    }
  }

  setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.opacity = opacity;
    }
  }

  async initialize(): Promise<void> {
    // Mock implementation
  }

  async clearAllLayers(): Promise<void> {
    this.layers.clear();
  }

  private getNextZIndex(): number {
    const layers = this.getAllLayers();
    return layers.length > 0 ? Math.max(...layers.map(l => l.zIndex)) + 1 : 0;
  }
}

// Export both the interface and the mock instance
export type { LayerManager };
export const layerManager = MockLayerManager.getInstance(); 