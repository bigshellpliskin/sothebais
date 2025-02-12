import { EventEmitter } from 'events';
import { CompositionEngine } from '../core/composition.js';
import { AssetManager } from '../core/assets.js';
import { LayoutManager } from '../core/layout.js';
import type { Scene, Transition } from '../types/layout.js';
import { logger } from '../utils/logger.js';

export interface RenderStats {
  fps: number;
  frameTime: number;
  frameCount: number;
  droppedFrames: number;
}

export class Renderer extends EventEmitter {
  private static instance: Renderer | null = null;
  private composition: CompositionEngine;
  private assetManager: AssetManager;
  private layoutManager: LayoutManager;
  private isRendering: boolean = false;
  private frameCount: number = 0;
  private droppedFrames: number = 0;
  private lastFrameTime: number = 0;
  private targetFPS: number = 60;
  private frameInterval: number;

  private constructor() {
    super();
    this.composition = CompositionEngine.getInstance();
    this.assetManager = AssetManager.getInstance();
    this.layoutManager = LayoutManager.getInstance();
    this.frameInterval = 1000 / this.targetFPS;

    logger.info('Renderer initialized', {
      targetFPS: this.targetFPS,
      frameInterval: this.frameInterval
    });
  }

  public static getInstance(): Renderer {
    if (!Renderer.instance) {
      Renderer.instance = new Renderer();
    }
    return Renderer.instance;
  }

  public async start(): Promise<void> {
    if (this.isRendering) {
      logger.warn('Renderer already running');
      return;
    }

    this.isRendering = true;
    this.lastFrameTime = performance.now();
    this.emit('render:started');

    while (this.isRendering) {
      const frameStartTime = performance.now();
      const timeSinceLastFrame = frameStartTime - this.lastFrameTime;

      // Check if we should render this frame
      if (timeSinceLastFrame >= this.frameInterval) {
        try {
          const activeScene = this.layoutManager.getActiveScene();
          if (activeScene) {
            await this.renderFrame(activeScene);
            this.frameCount++;
          }
          this.lastFrameTime = frameStartTime;
        } catch (error) {
          this.droppedFrames++;
          logger.error('Frame render error', { error });
        }
      }

      // Calculate time to next frame and sleep if needed
      const frameEndTime = performance.now();
      const frameTime = frameEndTime - frameStartTime;
      const timeToNextFrame = this.frameInterval - frameTime;

      if (timeToNextFrame > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToNextFrame));
      } else {
        this.droppedFrames++;
      }
    }
  }

  public stop(): void {
    this.isRendering = false;
    this.emit('render:stopped');
  }

  public getRenderStats(): RenderStats {
    return {
      fps: this.targetFPS,
      frameTime: performance.now() - this.lastFrameTime,
      frameCount: this.frameCount,
      droppedFrames: this.droppedFrames
    };
  }

  private async renderFrame(scene: Scene, transition?: Transition): Promise<void> {
    const startTime = performance.now();

    try {
      // Preload any new assets
      await this.assetManager.preloadAssets(scene.assets);

      // Render the scene
      const frame = await this.composition.renderScene(scene, transition);

      const endTime = performance.now();
      const frameTime = endTime - startTime;

      this.emit('frame:rendered', {
        frameTime,
        frameCount: this.frameCount,
        sceneId: scene.id
      });

      // Emit the frame buffer
      this.emit('frame:ready', frame);
    } catch (error) {
      logger.error('Error rendering frame', {
        sceneId: scene.id,
        error
      });
      throw error;
    }
  }

  public setTargetFPS(fps: number): void {
    this.targetFPS = fps;
    this.frameInterval = 1000 / fps;
    this.emit('fps:updated', fps);
  }

  public clearStats(): void {
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.lastFrameTime = performance.now();
  }
} 