/**
 * State Management System Types
 * 
 * This file contains types specific to the state management implementation.
 * These types are not general domain types, but rather implementation details
 * of how the state management system works.
 */

import type { StreamState } from './stream.js';
import type { SceneState } from './scene.js';
import type { Config } from './config.js';

/**
 * The complete application state structure
 */
export interface AppState {
  stream: StreamState;
  scene: SceneState;
}

/**
 * Events that can be emitted by the state manager
 */
export type StateUpdateEvent = {
  type: 'stream' | 'scene';
  payload: Partial<StreamState> | Partial<SceneState>;
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
} 