import type { PreviewClientState } from './state-manager.js';
import type { StreamState } from './stream.js';
import type { LayerState } from './layers.js';

// Base event interface
export interface BaseEvent {
  id: string;
  timestamp: number;
  type: EventType;
  source: EventSource;
}

// Event types enum
export enum EventType {
  // State events
  STATE_STREAM_UPDATE = 'state:stream:update',
  STATE_LAYER_UPDATE = 'state:layer:update',
  STATE_PREVIEW_UPDATE = 'state:preview:update',
  
  // Stream events
  STREAM_START = 'stream:start',
  STREAM_STOP = 'stream:stop',
  STREAM_PAUSE = 'stream:pause',
  STREAM_RESUME = 'stream:resume',
  STREAM_ERROR = 'stream:error',
  
  // Preview events
  PREVIEW_FRAME = 'preview:frame',
  PREVIEW_QUALITY_CHANGE = 'preview:quality:change',
  PREVIEW_CONNECTION = 'preview:connection',
  PREVIEW_DISCONNECTION = 'preview:disconnection',
  
  // Layer events
  LAYER_CREATE = 'layer:create',
  LAYER_UPDATE = 'layer:update',
  LAYER_DELETE = 'layer:delete',
  LAYER_REORDER = 'layer:reorder',
  
  // System events
  SYSTEM_ERROR = 'system:error',
  SYSTEM_WARNING = 'system:warning',
  SYSTEM_INFO = 'system:info'
}

// Event sources
export enum EventSource {
  STATE_MANAGER = 'state_manager',
  WEBSOCKET = 'websocket',
  HTTP_API = 'http_api',
  STREAM_CONTROLLER = 'stream_controller',
  PREVIEW_CLIENT = 'preview_client',
  SYSTEM = 'system'
}

// Payload types
export interface StreamEventPayload {
  previous?: Partial<StreamState>;
  current: Partial<StreamState>;
  changes: string[];
}

export interface LayerEventPayload {
  previous?: Partial<LayerState>;
  current: Partial<LayerState>;
  changes: string[];
}

export interface PreviewEventPayload {
  clientId: string;
  previous?: Partial<PreviewClientState>;
  current: Partial<PreviewClientState>;
  changes: string[];
  frame?: ArrayBuffer;
}

export interface SystemEventPayload {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Concrete event types
export interface StreamEvent extends BaseEvent {
  type: EventType.STATE_STREAM_UPDATE | EventType.STREAM_START | EventType.STREAM_STOP | 
        EventType.STREAM_PAUSE | EventType.STREAM_RESUME | EventType.STREAM_ERROR;
  payload: StreamEventPayload;
}

export interface LayerEvent extends BaseEvent {
  type: EventType.STATE_LAYER_UPDATE | EventType.LAYER_CREATE | 
        EventType.LAYER_UPDATE | EventType.LAYER_DELETE | EventType.LAYER_REORDER;
  payload: LayerEventPayload;
}

export interface PreviewEvent extends BaseEvent {
  type: EventType.STATE_PREVIEW_UPDATE | EventType.PREVIEW_FRAME | 
        EventType.PREVIEW_QUALITY_CHANGE | EventType.PREVIEW_CONNECTION | EventType.PREVIEW_DISCONNECTION;
  payload: PreviewEventPayload;
}

export interface SystemEvent extends BaseEvent {
  type: EventType.SYSTEM_ERROR | EventType.SYSTEM_WARNING | EventType.SYSTEM_INFO;
  payload: SystemEventPayload;
}

// Union type for all possible events
export type StreamManagerEvent = StreamEvent | LayerEvent | PreviewEvent | SystemEvent;

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