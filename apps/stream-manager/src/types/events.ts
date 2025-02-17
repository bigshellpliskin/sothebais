import type { StreamState } from '@shared/types/stream.js';
import type { SceneState } from './scene.js';

// Base event interface
export interface BaseEvent {
  id: string;
  timestamp: number;
  type: EventType;
  source: EventSource;
}

// Event types enum
export enum EventType {
  STATE_STREAM_UPDATE = 'state:stream:update',
  STATE_SCENE_UPDATE = 'state:scene:update',
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
  STATE_MANAGER = 'state_manager',
  STREAM_MANAGER = 'stream_manager',
  SCENE_MANAGER = 'scene_manager',
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
  type: EventType.STATE_STREAM_UPDATE;
  payload: {
    previous: StreamState;
    current: StreamState;
    changes: string[];
  };
}

export interface SceneEvent extends BaseEvent {
  type: EventType.STATE_SCENE_UPDATE;
  payload: {
    previous: SceneState;
    current: SceneState;
    changes: string[];
  };
}

// Union type for all possible events
export type StreamManagerEvent = StreamEvent | SceneEvent;

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