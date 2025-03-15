/**
 * Scene Types
 * 
 * Core interfaces and types for scene composition, animations, and rendering
 */

// ----- Canvas and Position Types -----

/**
 * Canvas dimensions and properties
 */
export interface Canvas {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * 2D point with x and y coordinates
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Position in 2D space (alias for Point2D)
 */
export interface Position extends Point2D {}

/**
 * Canvas transformation matrix
 */
export interface CanvasTransform {
  a: number;  // scale x
  b: number;  // skew y
  c: number;  // skew x
  d: number;  // scale y
  e: number;  // translate x
  f: number;  // translate y
}

/**
 * Simple transform properties
 */
export interface Transform {
  scale: number;
  rotation: number;
  anchor: { x: number; y: number };
  opacity: number;
}

/**
 * Rectangle bounds
 */
export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// ----- Animation Types -----

/**
 * Easing function types for animations
 */
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

/**
 * Properties that can be animated
 */
export type AnimatableProperty = 
  | 'opacity'
  | 'position'
  | 'scale'
  | 'rotation'
  | 'transform';

/**
 * Values that can be animated
 */
export type AnimationValue = number | Point2D | CanvasTransform;

/**
 * Base animation definition
 */
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

/**
 * Sequence of animations
 */
export interface Timeline {
  id: string;
  animations: Animation[];
  duration: number;
  loop?: boolean;
  currentTime?: number;
  paused?: boolean;
}

/**
 * Animation with multiple keyframes
 */
export interface KeyframeAnimation extends Omit<Animation, 'startValue' | 'endValue'> {
  keyframes: Array<{
    time: number;
    value: AnimationValue;
  }>;
}

/**
 * Physics-based spring animation
 */
export interface SpringAnimation extends Omit<Animation, 'duration' | 'easing'> {
  stiffness: number;
  damping: number;
  mass: number;
  velocity: number;
}

/**
 * Current state of all animations
 */
export type AnimationState = {
  activeAnimations: Animation[];
  activeTimelines: Timeline[];
  pausedAnimations: Animation[];
  pausedTimelines: Timeline[];
};

/**
 * Single animation keyframe
 */
export interface AnimationKeyframe {
  time: number;
  value: number | Point2D | CanvasTransform;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

// ----- Scene Composition Types -----

/**
 * Visual element in a scene
 */
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

/**
 * Scene quadrant identifier
 */
export type QuadrantId = 0 | 1 | 2 | 3 | 4;  // 0 = absolute positioning, 1-4 = quadrants

/**
 * Defined region within a scene
 */
export interface Quadrant {
  id: QuadrantId;
  name: string;
  bounds: Bounds;
  padding: number;
  assets: Asset[];  // Assets in this quadrant
}

/**
 * Complete scene definition
 */
export interface Scene {
  id: string;
  name: string;
  background: Asset[];     // Fixed bottom assets
  quadrants: Map<QuadrantId, Quadrant>;  // Quadrant-positioned assets
  overlay: Asset[];        // Fixed top assets
  metadata?: Record<string, unknown>;
}

/**
 * Scene transition effect
 */
export interface SceneTransition {
  type: 'fade' | 'slide' | 'zoom';
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

// ----- Rendering Service Interfaces -----

/**
 * Base interface for core services
 */
export interface CoreService {
  cleanup(): Promise<void>;
}

/**
 * Asset management service interface
 */
export interface AssetManager extends CoreService {
  loadAsset(source: string, type: string): Promise<Buffer>;
  storeAsset(source: string, data: Buffer): Promise<void>;
  deleteAsset(source: string): Promise<void>;
}

/**
 * Scene composition and rendering interface
 */
export interface CompositionEngine extends CoreService {
  renderScene(scene: Scene): Promise<Buffer>;
  updateDimensions(width: number, height: number): void;
  clearCache(): void;
}

/**
 * Static constructor for AssetManager
 */
export interface AssetManagerStatic {
  getInstance(): AssetManager;
  initialize(config: any): Promise<AssetManager>;
}

/**
 * Static constructor for CompositionEngine
 */
export interface CompositionEngineStatic {
  getInstance(): CompositionEngine;
  initialize(config: any): Promise<CompositionEngine>;
} 