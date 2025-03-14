import type { Scene, Asset, Quadrant, QuadrantId } from './core.js';

// Stream Configuration Types
export interface StreamConfig {
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  bitrate: number;
  codec: 'h264' | 'vp8' | 'vp9';
  preset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  quality: 'low' | 'medium' | 'high';
}

export interface AudioConfig {
  codec: 'aac' | 'opus';
  bitrate: number;
  sampleRate: number;
  channels: number;
}

// Stream Metrics Types
export interface StreamMetrics {
  fps: number;
  bitrate: number;
  droppedFrames: number;
  encoderLatency: number;
  bufferHealth: number;
  cpuUsage: number;
  memoryUsage: number;
}

// Stream Runtime State
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

// Stream Output Configuration
export interface StreamOutput {
  type: 'twitter' | 'rtmp' | 'file';
  url: string;
  key?: string;
}

// Scene State Types
export interface SceneState {
  background: Asset[];
  quadrants: Map<QuadrantId, Quadrant>;
  overlay: Asset[];
}

// Preview Client Types
export interface PreviewClient {
  id: string;
  quality: 'low' | 'medium' | 'high';
  lastPing: number;
  connected: boolean;
}

export interface PreviewState {
  clients: Record<string, PreviewClient>;
}

// Application State
export interface AppState {
  stream: StreamState;
  scene: SceneState;
  preview: Record<string, PreviewClient>;
}

// State Update Events
export type StateUpdateEvent = {
  type: 'stream' | 'scene' | 'preview';
  payload: Partial<StreamState> | Partial<SceneState> | Partial<PreviewClient>;
};

// Stream Events
export type StreamEvent = 
  | { type: 'streamStart'; timestamp: number }
  | { type: 'streamStop'; timestamp: number }
  | { type: 'streamError'; error: string; timestamp: number }
  | { type: 'metricsUpdate'; metrics: StreamMetrics; timestamp: number };

// Configuration Types
export interface RenderConfig {
  quality: 'low' | 'medium' | 'high';
  frameBuffer: number;
  dropFrames: boolean;
  metricsInterval: number;
}

export interface RTMPConfig {
  port: number;
  chunk_size: number;
  gop_cache: boolean;
  ping: number;
  ping_timeout: number;
} 