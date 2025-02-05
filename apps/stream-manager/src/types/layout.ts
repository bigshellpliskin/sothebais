import type { ViewportPosition, ViewportTransform } from './viewport.js';

export type AssetType = 'image' | 'video' | 'text' | 'vtuber' | 'overlay';

export interface AssetTransform extends ViewportTransform {
  anchor: { x: number; y: number };
  opacity: number;
}

export interface Asset {
  id: string;
  type: AssetType;
  source: string;
  position: ViewportPosition;
  transform: AssetTransform;
  zIndex: number;
  visible: boolean;
  metadata?: Record<string, unknown>;
}

export interface Scene {
  id: string;
  name: string;
  assets: Asset[];
  metadata?: Record<string, unknown>;
}

export type TransitionType = 'fade' | 'slide' | 'zoom';
export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

export interface Transition {
  type: TransitionType;
  duration: number;
  easing: EasingType;
}

export interface SceneTransitionEvent {
  from: string | null;
  to: string;
  transition: Transition;
}

export interface AssetUpdateEvent {
  sceneId: string;
  asset: Asset;
}

export interface AssetRemoveEvent {
  sceneId: string;
  assetId: string;
} 