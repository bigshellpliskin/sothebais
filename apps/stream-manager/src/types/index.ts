/**
 * Stream Manager Types Index
 * 
 * This file re-exports all types from the shared package to maintain
 * backward compatibility while centralizing type definitions.
 */

// Re-export all shared types
export * from '@sothebais/packages/types/index.js';

// Re-export types with aliases to maintain compatibility
import { streamConfigSchema } from '@sothebais/packages/types/config';
import type { z } from 'zod';

// Service-specific aliases for backward compatibility
export type Config = any; // Will be inferred from the schema in the actual code

// Re-export the configuration types with their original local names
export type {
  StreamConfig,
  AudioConfig,
  RTMPConfig,
  RenderConfig
} from '@sothebais/packages/types/config.js';

// Re-export scene types with canvas-specific aliases
export type {
  Canvas,
  Transform,
  Bounds,
  Asset,
  Quadrant
} from '@sothebais/packages/types/scene.js';

// Re-export core service interfaces
export type {
  CoreService,
  AssetManager,
  CompositionEngine,
  AssetManagerStatic,
  CompositionEngineStatic
} from '@sothebais/packages/types/scene.js';

// Re-export state manager and related types
export type {
  StateManager
} from '@sothebais/packages/types/stream.js';

// Re-export additional event types needed for backwards compatibility
export type {
  StreamEvent,
  StateUpdateEvent as StateEvent,
  StreamState,
  SceneState
} from '@sothebais/packages/types/stream.js';

// Define missing RTMP event payload type
export interface RTMPEventPayload {
  app?: string;
  streamPath?: string;
  clientId?: string;
  streamId?: string;
  args?: string[];
  code?: number;
  level?: string;
  message?: string;
  details?: any;
  connectionType?: ConnectionType | string;
  timestamp?: number;
  duration?: number;
}

// Define RTMP connection types
export const RTMP_CONNECTION_TYPES = {
  PUBLISHER: 'PUBLISHER',
  PLAYER: 'PLAYER',
  PENDING: 'PENDING'
} as const;

export type RTMPConnectionType = typeof RTMP_CONNECTION_TYPES[keyof typeof RTMP_CONNECTION_TYPES];

// Define connection types including PUBLISHER and PLAYER
export const CONNECTION_TYPES = {
  INTERNAL: 'INTERNAL',
  EXTERNAL: 'EXTERNAL',
  HTTP: 'HTTP',
  WEBSOCKET: 'WEBSOCKET',
  RTMP: 'RTMP',
  REDIS: 'REDIS',
  REST: 'REST',
  GRAPHQL: 'GRAPHQL',
  GRPC: 'GRPC',
  PUBLISHER: 'PUBLISHER',
  PLAYER: 'PLAYER',
  STREAM_MANAGER: 'STREAM_MANAGER'
} as const;

export type ConnectionType = typeof CONNECTION_TYPES[keyof typeof CONNECTION_TYPES];

// Define event types for the application
export const EVENT_TYPES = {
  // Stream events
  STREAM_START: 'stream:start',
  STREAM_STOP: 'stream:stop',
  STREAM_ERROR: 'stream:error',
  STREAM_METRICS: 'stream:metrics',
  
  // State events
  STATE_STREAM_UPDATE: 'state:stream:update',
  STATE_SCENE_UPDATE: 'state:scene:update',
  
  // Preview events
  PREVIEW_CONNECT: 'preview:connected',
  PREVIEW_DISCONNECT: 'preview:disconnected',
  PREVIEW_QUALITY_CHANGE: 'preview:updated',
  
  // RTMP events
  RTMP_CONNECTION: 'rtmp:connection',
  RTMP_DISCONNECTION: 'rtmp:disconnection',
  RTMP_PUBLISH_START: 'rtmp:publish:start',
  RTMP_PUBLISH_STOP: 'rtmp:publish:stop',
  RTMP_PLAY_START: 'rtmp:play:start',
  RTMP_PLAY_STOP: 'rtmp:play:stop'
} as const;

export type EventTypeValue = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// Define service-specific event types for stream manager
export interface StreamManagerEvent {
  id?: string;
  type: 'manager:started' | 'manager:stopped' | 'manager:error';
  source?: EventSource;
  timestamp?: number;
  payload?: any;
}

export interface SceneEvent {
  id?: string;
  type: 'scene:updated' | 'scene:created' | 'scene:deleted';
  source?: EventSource;
  timestamp?: number;
  payload?: any;
}

export interface PreviewEvent {
  id?: string;
  type: 'preview:connected' | 'preview:disconnected' | 'preview:updated';
  source?: EventSource;
  timestamp?: number;
  payload?: any;
}

// Define a type for event listeners
export type EventSource = ConnectionType;

// Define a generic AnyEvent type that encompasses all event types to avoid import issues
export type AnyEvent = StreamManagerEvent | SceneEvent | PreviewEvent | { id?: string; type: string; source?: EventSource; timestamp?: number; payload?: any };

export interface StreamManagerEventListener {
  (event: AnyEvent): Promise<void> | void;
}

// Define event type for consistency with imports
export type EventType = EventTypeValue; 