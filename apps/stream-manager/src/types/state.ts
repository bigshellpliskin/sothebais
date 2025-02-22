import type { Scene, Asset, Quadrant, QuadrantId } from './core.js';
import type { StreamConfig, AudioConfig } from './config.js';
import type { Config } from './config.js';
import type { EventType, EventListener } from './events.js';

// Stream State Types
export interface StreamMetrics {
  fps: number;
  bitrate: number;
  droppedFrames: number;
  encoderLatency: number;
  bufferHealth: number;
  cpuUsage: number;
  memoryUsage: number;
}

export interface StreamState {
  isLive: boolean;
  isPaused: boolean;
  fps: number;
  targetFPS: number;
  frameCount: number;
  droppedFrames: number;
  averageRenderTime: number;
  startTime?: number | null;
  error?: string | null;
  config?: StreamConfig;
  audio?: AudioConfig;
  metrics?: StreamMetrics;
  currentScene?: Scene | null;
}

// Scene State Types
export interface SceneState {
  background: Asset[];
  quadrants: Map<QuadrantId, Quadrant>;
  overlay: Asset[];
}

// Preview State Types
export interface PreviewClient {
  id: string;
  quality: 'low' | 'medium' | 'high';
  lastPing: number;
  connected: boolean;
}

export interface PreviewState {
  clients: Record<string, PreviewClient>;
}

/**
 * The complete application state structure
 */
export interface AppState {
  stream: StreamState;
  scene: SceneState;
  preview: Record<string, PreviewClient>;
}

/**
 * Events that can be emitted by the state manager
 */
export type StateUpdateEvent = {
  type: 'stream' | 'scene' | 'preview';
  payload: Partial<StreamState> | Partial<SceneState> | Partial<PreviewClient>;
};

/**
 * Listener for state update events
 */
export interface StateEventListener {
  (event: StateUpdateEvent): void;
}

/**
 * Interface defining the state manager's public API
 */
export interface StateManager {
  initialize(config: Config): Promise<void>;
  getStreamState(): StreamState;
  getSceneState(): SceneState;
  updateStreamState(update: Partial<StreamState>): Promise<void>;
  updateSceneState(update: Partial<SceneState>): Promise<void>;
  loadState(): Promise<void>;
  saveState(): Promise<void>;
  // Preview client methods
  getPreviewClients(): Record<string, PreviewClient>;
  updatePreviewClient(clientId: string, update: Partial<PreviewClient>): void;
  // Event methods
  on(type: EventType, listener: EventListener): void;
  off(type: EventType, listener: EventListener): void;
  once(type: EventType, listener: EventListener): void;
} 