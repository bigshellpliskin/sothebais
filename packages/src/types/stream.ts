/**
 * Stream Types
 * 
 * Core types for stream state, configuration, and metrics
 */

import type { Scene, Asset, Quadrant, QuadrantId } from './scene.js';
import type { EventType, EventListener } from './events.js';
import type { 
  StreamConfig,
  AudioConfig,
  RenderConfig
} from './config.js';

// ----- Stream State Types -----

/**
 * Stream Runtime State
 */
export interface StreamState {
  isLive: boolean;
  isPaused: boolean;
  fps: number;
  targetFPS: number;
  frameCount: number;
  droppedFrames: number;
  averageRenderTime: number;
  startTime: number | null;
  error: string | null;
  config?: StreamConfig;
  audio?: AudioConfig;
  metrics?: StreamMetrics;
  currentScene?: Scene | null;
}

/**
 * Scene State - Current state of scene composition
 */
export interface SceneState {
  background: Asset[];
  quadrants: Map<QuadrantId, Quadrant>;
  overlay: Asset[];
}

/**
 * Preview Client - Client connected to preview stream
 */
export interface PreviewClient {
  id: string;
  quality: 'low' | 'medium' | 'high';
  lastPing: number;
  connected: boolean;
}

/**
 * Application State
 */
export interface AppState {
  stream: StreamState;
  scene: SceneState;
  preview: Record<string, PreviewClient>;
}

/**
 * Stream performance metrics
 */
export interface StreamMetrics {
  fps: number;
  bitrate: number;
  droppedFrames: number;
  encoderLatency: number;
  bufferHealth: number;
  cpuUsage: number;
  memoryUsage: number;
}

/**
 * Event for state updates
 */
export type StateUpdateEvent = {
  type: 'stream' | 'scene' | 'preview';
  payload: Partial<StreamState> | Partial<SceneState> | Partial<PreviewClient>;
};

/**
 * Stream lifecycle and metrics events
 */
export type StreamEvent = 
  | { type: 'streamStart'; timestamp: number }
  | { type: 'streamStop'; timestamp: number }
  | { type: 'streamError'; error: string; timestamp: number }
  | { type: 'metricsUpdate'; metrics: StreamMetrics; timestamp: number };

/**
 * Stream output configuration
 */
export interface StreamOutput {
  type: 'twitter' | 'rtmp' | 'file';
  url: string;
  key?: string;
}

/**
 * State Manager Interface
 */
export interface StateManager {
  initialize(config: any): Promise<void>;
  getStreamState(): StreamState;
  getSceneState(): SceneState;
  updateStreamState(update: Partial<StreamState>): Promise<void>;
  updateSceneState(update: Partial<SceneState>): Promise<void>;
  loadState(): Promise<void>;
  saveState(): Promise<void>;
  
  // Preview client methods
  getPreviewClients(): Record<string, PreviewClient>;
  updatePreviewClient(
    clientId: string, 
    update: Partial<PreviewClient>
  ): void;
  
  // Event methods
  on(type: EventType, listener: EventListener): void;
  off(type: EventType, listener: EventListener): void;
  once(type: EventType, listener: EventListener): void;
} 