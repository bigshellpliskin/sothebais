import type { Scene, Asset } from './core.js';
import type { StreamState, PreviewClient, SceneState } from './state.js';

// Base event interface
export interface BaseEvent {
  id: string;
  timestamp: number;
  type: EventType;
  source: EventSource;
}

// Event types enum
export enum EventType {
  // Stream events
  STREAM_START = 'stream:start',
  STREAM_STOP = 'stream:stop',
  STREAM_ERROR = 'stream:error',
  STREAM_STATE_UPDATE = 'stream:state:update',
  STREAM_METRICS_UPDATE = 'stream:metrics:update',
  
  // Scene events
  SCENE_LOAD = 'scene:load',
  SCENE_UNLOAD = 'scene:unload',
  SCENE_UPDATE = 'scene:update',
  SCENE_ASSET_ADD = 'scene:asset:add',
  SCENE_ASSET_REMOVE = 'scene:asset:remove',
  SCENE_ASSET_UPDATE = 'scene:asset:update',
  
  // State events
  STATE_STREAM_UPDATE = 'state:stream:update',
  STATE_SCENE_UPDATE = 'state:scene:update',
  STATE_PREVIEW_UPDATE = 'state:preview:update',
  
  // Preview events
  PREVIEW_CONNECT = 'preview:connect',
  PREVIEW_DISCONNECT = 'preview:disconnect',
  PREVIEW_QUALITY_CHANGE = 'preview:quality:change',
  PREVIEW_FRAME = 'preview:frame',
  // RTMP Events
  RTMP_CONNECTION = 'rtmp:connection',
  RTMP_DISCONNECTION = 'rtmp:disconnection',
  RTMP_PUBLISH_START = 'rtmp:publish:start',
  RTMP_PUBLISH_STOP = 'rtmp:publish:stop',
  RTMP_PLAY_START = 'rtmp:play:start',
  RTMP_PLAY_STOP = 'rtmp:play:stop'
}

// Event sources
export enum EventSource {
  STREAM_MANAGER = 'stream-manager',
  SCENE_MANAGER = 'scene-manager',
  STATE_MANAGER = 'state-manager',
  PREVIEW_MANAGER = 'preview-manager',
  RTMP_SERVER = 'rtmp_server'
}

// Connection types for RTMP server
export enum ConnectionType {
  PENDING = 'pending',
  PUBLISHER = 'publisher',
  PLAYER = 'player'
}

// Payload types
export interface StreamEventPayload {
  previous?: Partial<StreamState>;
  current: Partial<StreamState>;
  changes: string[];
}

export interface SystemEventPayload {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface RTMPEventPayload {
  clientId: string;
  connectionType: ConnectionType;
  streamPath?: string;
  timestamp: number;
  duration?: number;
}

// Concrete event types
export interface StreamEvent extends BaseEvent {
  type: EventType.STREAM_START | EventType.STREAM_STOP | EventType.STREAM_ERROR | EventType.STREAM_STATE_UPDATE | EventType.STREAM_METRICS_UPDATE;
  payload: {
    state?: Partial<StreamState>;
    error?: string;
  };
}

export interface SceneEvent extends BaseEvent {
  type: EventType.SCENE_LOAD | EventType.SCENE_UNLOAD | EventType.SCENE_UPDATE | EventType.SCENE_ASSET_ADD | EventType.SCENE_ASSET_REMOVE | EventType.SCENE_ASSET_UPDATE;
  payload: {
    scene?: Scene;
    asset?: Asset;
  };
}

export interface StateEvent extends BaseEvent {
  type: EventType.STATE_STREAM_UPDATE | EventType.STATE_SCENE_UPDATE | EventType.STATE_PREVIEW_UPDATE;
  payload: {
    state?: Partial<StreamState> | Scene | SceneState;
  };
}

export interface PreviewEvent extends BaseEvent {
  type: EventType.PREVIEW_CONNECT | EventType.PREVIEW_DISCONNECT | EventType.PREVIEW_QUALITY_CHANGE | EventType.PREVIEW_FRAME;
  payload: {
    clientId: string;
    client?: PreviewClient;
    quality?: 'low' | 'medium' | 'high';
    frame?: Buffer;
  };
}

// Union type for all possible events
export type StreamManagerEvent = StreamEvent | SceneEvent | StateEvent | PreviewEvent;

// Event listener type
export type EventListener = (event: StreamManagerEvent) => void | Promise<void>;

// Event emitter interface
export interface EventEmitter {
  emit(event: StreamManagerEvent): Promise<void>;
  on(type: EventType, listener: EventListener): void;
  off(type: EventType, listener: EventListener): void;
  once(type: EventType, listener: EventListener): void;
  removeAllListeners(type?: EventType): void;
  listenerCount(type: EventType): number;
} 