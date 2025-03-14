/**
 * Event Types
 * 
 * Re-exports from shared package to maintain backward compatibility
 */

import type { Scene, Asset } from './core.js';
import type { StreamState, PreviewClient, SceneState } from './state.js';

// Re-export event types from shared package
export { EventType, EventSource, ConnectionType } from '@sothebais/shared/types/events.js';

// Payload types specific to stream-manager
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
  connectionType: import('@sothebais/shared/types/events.js').ConnectionType;
  streamPath?: string;
  timestamp: number;
  duration?: number;
}

// Base event interface
export interface BaseEvent {
  id: string;
  timestamp: number;
  type: import('@sothebais/shared/types/events.js').EventType;
  source: import('@sothebais/shared/types/events.js').EventSource;
}

// Concrete event types
export interface StreamEvent extends BaseEvent {
  type: import('@sothebais/shared/types/events.js').EventType.STREAM_START | 
        import('@sothebais/shared/types/events.js').EventType.STREAM_END | 
        import('@sothebais/shared/types/events.js').EventType.STREAM_ERROR | 
        import('@sothebais/shared/types/events.js').EventType.STREAM_STATE_UPDATE | 
        import('@sothebais/shared/types/events.js').EventType.STREAM_METRICS_UPDATE;
  payload: {
    state?: Partial<StreamState>;
    error?: string;
  };
}

export interface SceneEvent extends BaseEvent {
  type: import('@sothebais/shared/types/events.js').EventType.SCENE_LOAD | 
        import('@sothebais/shared/types/events.js').EventType.SCENE_UNLOAD | 
        import('@sothebais/shared/types/events.js').EventType.SCENE_UPDATE | 
        import('@sothebais/shared/types/events.js').EventType.SCENE_ASSET_ADD | 
        import('@sothebais/shared/types/events.js').EventType.SCENE_ASSET_REMOVE | 
        import('@sothebais/shared/types/events.js').EventType.SCENE_ASSET_UPDATE;
  payload: {
    scene?: Scene;
    asset?: Asset;
  };
}

export interface StateEvent extends BaseEvent {
  type: import('@sothebais/shared/types/events.js').EventType.STATE_STREAM_UPDATE | 
        import('@sothebais/shared/types/events.js').EventType.STATE_SCENE_UPDATE | 
        import('@sothebais/shared/types/events.js').EventType.STATE_PREVIEW_UPDATE;
  payload: {
    state?: Partial<StreamState> | Scene | SceneState;
  };
}

export interface PreviewEvent extends BaseEvent {
  type: import('@sothebais/shared/types/events.js').EventType.PREVIEW_CONNECT | 
        import('@sothebais/shared/types/events.js').EventType.PREVIEW_DISCONNECT | 
        import('@sothebais/shared/types/events.js').EventType.PREVIEW_QUALITY_CHANGE | 
        import('@sothebais/shared/types/events.js').EventType.PREVIEW_FRAME;
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
  on(type: import('@sothebais/shared/types/events.js').EventType, listener: EventListener): void;
  off(type: import('@sothebais/shared/types/events.js').EventType, listener: EventListener): void;
  once(type: import('@sothebais/shared/types/events.js').EventType, listener: EventListener): void;
  removeAllListeners(type?: import('@sothebais/shared/types/events.js').EventType): void;
  listenerCount(type: import('@sothebais/shared/types/events.js').EventType): number;
} 