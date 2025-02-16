import type { Config } from './config.js';
import type { Scene } from '../core/scene-manager.js';

export interface CoreService {
  cleanup(): Promise<void>;
}

export interface AssetManager extends CoreService {
  loadAsset(source: string, type: string): Promise<Buffer>;
  storeAsset(source: string, data: Buffer): Promise<void>;
  deleteAsset(source: string): Promise<void>;
}

export interface CompositionEngine extends CoreService {
  renderScene(scene: Scene): Promise<Buffer>;
  updateDimensions(width: number, height: number): void;
  clearCache(): void;
}

export interface StreamManager extends CoreService {
  initialize(config: Config, deps: {
    assets: AssetManager;
    composition: CompositionEngine;
    currentScene: Scene;
  }): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  getMetrics(): {
    frameCount: number;
    droppedFrames: number;
    fps: number;
    encoderMetrics: Record<string, unknown>;
    pipelineMetrics: Record<string, unknown>;
  };
}

// Static initialization methods
export interface AssetManagerStatic {
  getInstance(): AssetManager;
  initialize(config: Config): Promise<AssetManager>;
}

export interface CompositionEngineStatic {
  getInstance(): CompositionEngine;
  initialize(config: Config): Promise<CompositionEngine>;
}

export interface StreamManagerStatic {
  getInstance(): StreamManager;
  initialize(config: Config): Promise<StreamManager>;
} 