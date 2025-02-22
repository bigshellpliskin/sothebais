import type { Config } from './config.js';

// Canvas Types
export interface Canvas {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Position extends Point2D {}

export interface CanvasTransform {
  a: number;  // scale x
  b: number;  // skew y
  c: number;  // skew x
  d: number;  // scale y
  e: number;  // translate x
  f: number;  // translate y
}

export interface Transform {
  scale: number;
  rotation: number;
  anchor: { x: number; y: number };
  opacity: number;
}

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// Animation Types
export type EasingFunction = 
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'easeInOutElastic'
  | 'spring';

export type AnimatableProperty = 
  | 'opacity'
  | 'position'
  | 'scale'
  | 'rotation'
  | 'transform';

export type AnimationValue = number | Point2D | CanvasTransform;

export interface Animation {
  id: string;
  targetLayerId: string;
  property: AnimatableProperty;
  startValue: AnimationValue;
  endValue: AnimationValue;
  duration: number;
  easing: EasingFunction;
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
}

export interface Timeline {
  id: string;
  animations: Animation[];
  duration: number;
  loop?: boolean;
  currentTime?: number;
  paused?: boolean;
}

export interface KeyframeAnimation extends Omit<Animation, 'startValue' | 'endValue'> {
  keyframes: Array<{
    time: number;
    value: AnimationValue;
  }>;
}

export interface SpringAnimation extends Omit<Animation, 'duration' | 'easing'> {
  stiffness: number;
  damping: number;
  mass: number;
  velocity: number;
}

export type AnimationState = {
  activeAnimations: Animation[];
  activeTimelines: Timeline[];
  pausedAnimations: Animation[];
  pausedTimelines: Timeline[];
};

export interface AnimationKeyframe {
  time: number;
  value: number | Point2D | CanvasTransform;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

// Scene Asset Types
export interface Asset {
  id: string;
  type: 'image' | 'text' | 'video' | 'stream' | 'overlay';
  source: string;
  position: Position;
  transform: Transform;
  visible: boolean;
  zIndex: number;
  metadata?: Record<string, unknown>;
}

// Quadrant Types
export type QuadrantId = 0 | 1 | 2 | 3 | 4;  // 0 = absolute positioning, 1-4 = quadrants

export interface Quadrant {
  id: QuadrantId;
  name: string;
  bounds: Bounds;
  padding: number;
  assets: Asset[];  // Assets in this quadrant
}

// Scene Structure
export interface Scene {
  id: string;
  name: string;
  background: Asset[];     // Fixed bottom assets
  quadrants: Map<QuadrantId, Quadrant>;  // Quadrant-positioned assets
  overlay: Asset[];        // Fixed top assets
  metadata?: Record<string, unknown>;
}

export interface SceneTransition {
  type: 'fade' | 'slide' | 'zoom';
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

// Core Services
export interface CoreService {
  cleanup(): Promise<void>;
}

export interface AssetManager extends CoreService {
  loadAsset(source: string, type: string): Promise<Buffer>;
  storeAsset(source: string, data: Buffer): Promise<void>;
  deleteAsset(source: string): Promise<void>;
}

export interface CompositionEngine extends CoreService {
  renderScene(scene: Scene): Promise<Buffer>;
  updateDimensions(width: number, height: number): void;
  clearCache(): void;
}

export interface StreamManager extends CoreService {
  initialize(config: Config, deps: {
    assets: AssetManager;
    composition: CompositionEngine;
    currentScene: Scene;
  }): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  getMetrics(): {
    frameCount: number;
    droppedFrames: number;
    fps: number;
    encoderMetrics: Record<string, unknown>;
    pipelineMetrics: Record<string, unknown>;
  };
}

// Static initialization methods
export interface AssetManagerStatic {
  getInstance(): AssetManager;
  initialize(config: Config): Promise<AssetManager>;
}

export interface CompositionEngineStatic {
  getInstance(): CompositionEngine;
  initialize(config: Config): Promise<CompositionEngine>;
}

export interface StreamManagerStatic {
  getInstance(): StreamManager;
  initialize(config: Config): Promise<StreamManager>;
} 