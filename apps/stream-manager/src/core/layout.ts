import { EventEmitter } from 'events';
import { ViewportManager } from './viewport.js';
import type { ViewportPosition, ViewportTransform } from './viewport.js';
import { logger } from '../utils/logger.js';

export interface LayoutAsset {
  id: string;
  type: 'image' | 'video' | 'text' | 'vtuber' | 'overlay';
  source: string;
  position: ViewportPosition;
  transform: ViewportTransform & {
    anchor: { x: number; y: number };
    opacity: number;
  };
  zIndex: number;
  visible: boolean;
  metadata?: Record<string, unknown>;
}

export interface LayoutScene {
  id: string;
  name: string;
  assets: LayoutAsset[];
  metadata?: Record<string, unknown>;
}

export interface LayoutTransition {
  type: 'fade' | 'slide' | 'zoom';
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export class LayoutManager extends EventEmitter {
  private static instance: LayoutManager | null = null;
  private viewport: ViewportManager;
  private scenes: Map<string, LayoutScene>;
  private activeScene: string | null;
  private transitions: Map<string, LayoutTransition>;

  private constructor() {
    super();
    this.viewport = ViewportManager.getInstance();
    this.scenes = new Map();
    this.activeScene = null;
    this.transitions = new Map();

    // Register default transitions
    this.transitions.set('default_fade', {
      type: 'fade',
      duration: 500,
      easing: 'easeInOut'
    });

    logger.info('Layout manager initialized');
  }

  public static getInstance(): LayoutManager {
    if (!LayoutManager.instance) {
      LayoutManager.instance = new LayoutManager();
    }
    return LayoutManager.instance;
  }

  // Scene Management
  public createScene(name: string, metadata?: Record<string, unknown>): LayoutScene {
    const id = `scene_${Date.now()}`;
    const scene: LayoutScene = {
      id,
      name,
      assets: [],
      metadata
    };
    
    this.scenes.set(id, scene);
    this.emit('scene:created', scene);
    return scene;
  }

  public getScene(id: string): LayoutScene | undefined {
    return this.scenes.get(id);
  }

  public getAllScenes(): LayoutScene[] {
    return Array.from(this.scenes.values());
  }

  public deleteScene(id: string): boolean {
    const deleted = this.scenes.delete(id);
    if (deleted) {
      this.emit('scene:deleted', id);
    }
    return deleted;
  }

  // Asset Management
  public addAsset(sceneId: string, asset: Omit<LayoutAsset, 'id'>): LayoutAsset | null {
    const scene = this.scenes.get(sceneId);
    if (!scene) return null;

    const newAsset: LayoutAsset = {
      ...asset,
      id: `asset_${Date.now()}`
    };

    // Ensure position is within safe area
    newAsset.position = this.viewport.constrainToSafeArea(newAsset.position);

    scene.assets.push(newAsset);
    this.emit('asset:added', { sceneId, asset: newAsset });
    return newAsset;
  }

  public updateAsset(sceneId: string, assetId: string, updates: Partial<LayoutAsset>): boolean {
    const scene = this.scenes.get(sceneId);
    if (!scene) return false;

    const assetIndex = scene.assets.findIndex(a => a.id === assetId);
    if (assetIndex === -1) return false;

    // Update asset with new properties
    scene.assets[assetIndex] = {
      ...scene.assets[assetIndex],
      ...updates,
      // Ensure position stays within safe area if updated
      position: updates.position ? 
        this.viewport.constrainToSafeArea(updates.position) : 
        scene.assets[assetIndex].position
    };

    this.emit('asset:updated', {
      sceneId,
      asset: scene.assets[assetIndex]
    });

    return true;
  }

  public removeAsset(sceneId: string, assetId: string): boolean {
    const scene = this.scenes.get(sceneId);
    if (!scene) return false;

    const assetIndex = scene.assets.findIndex(a => a.id === assetId);
    if (assetIndex === -1) return false;

    scene.assets.splice(assetIndex, 1);
    this.emit('asset:removed', { sceneId, assetId });
    return true;
  }

  // Scene Transitions
  public async transitionToScene(targetSceneId: string, transitionId: string = 'default_fade'): Promise<boolean> {
    const targetScene = this.scenes.get(targetSceneId);
    if (!targetScene) return false;

    const transition = this.transitions.get(transitionId);
    if (!transition) return false;

    const previousSceneId = this.activeScene;
    this.activeScene = targetSceneId;

    this.emit('scene:transitioning', {
      from: previousSceneId,
      to: targetSceneId,
      transition
    });

    // Simulate transition duration
    await new Promise(resolve => setTimeout(resolve, transition.duration));

    this.emit('scene:transitioned', {
      from: previousSceneId,
      to: targetSceneId
    });

    return true;
  }

  public getActiveScene(): LayoutScene | null {
    return this.activeScene ? this.scenes.get(this.activeScene) || null : null;
  }

  // Layout Utilities
  public snapAllAssetsToGrid(sceneId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    scene.assets = scene.assets.map(asset => ({
      ...asset,
      position: this.viewport.snapToGrid(asset.position)
    }));

    this.emit('scene:updated', scene);
  }

  public sortAssetsByZIndex(sceneId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    scene.assets.sort((a, b) => a.zIndex - b.zIndex);
    this.emit('scene:updated', scene);
  }
} 