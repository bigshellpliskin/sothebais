import type { Asset, Quadrant, QuadrantId } from '../core/scene-manager.js';

export interface SceneState {
  background: Asset[];
  quadrants: Map<QuadrantId, Quadrant>;
  overlay: Asset[];
} 