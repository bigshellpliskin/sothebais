import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { AssetManager } from './assets.js';
import type {
  Canvas,
  Position,
  Transform,
  Bounds,
  Asset,
  QuadrantId,
  Quadrant,
  Scene,
  SceneTransition
} from '@sothebais/packages/types/scene.js';

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