/**
 * State Types
 * 
 * Re-exports from shared package to maintain backward compatibility
 */

import type { Config } from './config.js';
import type { EventType, EventListener } from './events.js';

export * from '@sothebais/shared/types/stream.js';

// Re-export service-specific interfaces that aren't in the shared package
export interface StateManager {
  initialize(config: Config): Promise<void>;
  getStreamState(): import('@sothebais/shared/types/stream.js').StreamState;
  getSceneState(): import('@sothebais/shared/types/stream.js').SceneState;
  updateStreamState(update: Partial<import('@sothebais/shared/types/stream.js').StreamState>): Promise<void>;
  updateSceneState(update: Partial<import('@sothebais/shared/types/stream.js').SceneState>): Promise<void>;
  loadState(): Promise<void>;
  saveState(): Promise<void>;
  
  // Preview client methods
  getPreviewClients(): Record<string, import('@sothebais/shared/types/stream.js').PreviewClient>;
  updatePreviewClient(
    clientId: string, 
    update: Partial<import('@sothebais/shared/types/stream.js').PreviewClient>
  ): void;
  
  // Event methods
  on(type: EventType, listener: EventListener): void;
  off(type: EventType, listener: EventListener): void;
  once(type: EventType, listener: EventListener): void;
} 