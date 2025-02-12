import type { Config, ViewportConfig, AssetConfig, LayoutConfig, WorkerPoolConfig } from './config.js';

export interface CoreService {
  cleanup(): Promise<void>;
}

export interface ViewportManager extends CoreService {
  getWidth(): number;
  getHeight(): number;
  resize(width: number, height: number): Promise<void>;
}

export interface AssetManager extends CoreService {
  loadAsset(id: string): Promise<Buffer>;
  storeAsset(id: string, data: Buffer): Promise<void>;
  deleteAsset(id: string): Promise<void>;
}

export interface LayoutManager extends CoreService {
  addLayer(id: string): Promise<void>;
  removeLayer(id: string): Promise<void>;
  updateLayer(id: string, visible: boolean): Promise<void>;
}

export interface CompositionEngine extends CoreService {
  render(): Promise<Buffer>;
  updateLayout(): Promise<void>;
  getMetrics(): any; // TODO: Define metrics type
}

export interface WorkerPoolManager extends CoreService {
  addTask(task: any): Promise<any>; // TODO: Define task types
  getMetrics(): any; // TODO: Define metrics type
}

// Static initialization methods for core services
export interface ViewportManagerStatic {
  getInstance(): ViewportManager;
  initialize(config: Config): Promise<ViewportManager>;
}

export interface AssetManagerStatic {
  getInstance(): AssetManager;
  initialize(config: Config): Promise<AssetManager>;
}

export interface LayoutManagerStatic {
  getInstance(): LayoutManager;
  initialize(config: Config): Promise<LayoutManager>;
}

export interface CompositionEngineStatic {
  getInstance(): CompositionEngine;
  initialize(config: {
    viewport: ViewportManager;
    assets: AssetManager;
    layout: LayoutManager;
  }): Promise<CompositionEngine>;
}

export interface WorkerPoolManagerStatic {
  getInstance(): WorkerPoolManager;
  initialize(config: WorkerPoolConfig): Promise<WorkerPoolManager>;
} 