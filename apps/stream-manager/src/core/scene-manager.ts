import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { AssetManager } from './assets.js';

// Canvas Types
export interface Canvas {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface Position {
  x: number;
  y: number;
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

// Scene Asset Types
export interface Asset {
  id: string;
  type: 'image' | 'video' | 'text' | 'vtuber' | 'overlay';
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

export class SceneManager extends EventEmitter {
  private static instance: SceneManager | null = null;
  private scenes: Map<string, Scene>;
  private activeScene: string | null;
  private transitions: Map<string, SceneTransition>;
  private assetManager: AssetManager;

  // Canvas properties
  private canvas: Canvas;
  private safeArea: Bounds;

  private constructor(width: number = 1920, height: number = 1080) {
    super();
    this.scenes = new Map();
    this.activeScene = null;
    this.transitions = new Map();
    this.assetManager = AssetManager.getInstance();

    // Initialize canvas
    this.canvas = {
      width,
      height,
      aspectRatio: width / height
    };

    // Initialize safe area (90% of canvas by default)
    const margin = {
      x: width * 0.05,
      y: height * 0.05
    };

    this.safeArea = {
      left: margin.x,
      right: width - margin.x,
      top: margin.y,
      bottom: height - margin.y
    };

    // Register default transitions
    this.transitions.set('default_fade', {
      type: 'fade',
      duration: 500,
      easing: 'easeInOut'
    });

    logger.info('Scene manager initialized', {
      canvas: this.canvas,
      safeArea: this.safeArea
    });
  }

  public static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }
} 