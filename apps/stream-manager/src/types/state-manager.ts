/**
 * State Management System Types
 * 
 * This file contains types specific to the state management implementation.
 * These types are not general domain types, but rather implementation details
 * of how the state management system works.
 */

import type { LayerState } from './layers.js';
import type { StreamState } from './stream.js';
import type { EventType, EventListener } from './events.js';

/**
 * Represents the state of a preview client connection
 */
export interface PreviewClientState {
  id: string;
  quality: 'high' | 'medium' | 'low';
  lastPing: number;
  connected: boolean;
}

/**
 * The complete application state structure
 */
export interface AppState {
  stream: StreamState;
  layers: LayerState;
  previewClients: Record<string, PreviewClientState>;
}

/**
 * Events that can be emitted by the state manager
 */
export type StateUpdateEvent = {
  type: 'stream' | 'layers' | 'previewClient';
  payload: Partial<StreamState> | Partial<LayerState> | PreviewClientState;
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
  // State getters
  getStreamState(): StreamState;
  getLayerState(): LayerState;
  getPreviewClients(): Record<string, PreviewClientState>;
  
  // State updates
  updateStreamState(update: Partial<StreamState>): Promise<void>;
  updateLayerState(update: Partial<LayerState>): Promise<void>;
  updatePreviewClient(clientId: string, update: Partial<PreviewClientState>): Promise<void>;
  
  // State persistence
  loadState(): Promise<void>;
  saveState(): Promise<void>;

  // Event handling - now delegates to eventEmitter
  on(type: EventType, listener: EventListener): void;
  off(type: EventType, listener: EventListener): void;
  once(type: EventType, listener: EventListener): void;
} 