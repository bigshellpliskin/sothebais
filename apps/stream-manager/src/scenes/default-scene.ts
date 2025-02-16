import type { Scene, QuadrantId, Quadrant } from '../core/scene-manager.js';
import type { Config } from '../types/config.js';

export function createDefaultScene(config: Config): Scene {
  const [width, height] = config.STREAM_RESOLUTION.split('x').map(Number);
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // Create a basic scene with 4 quadrants
  const scene: Scene = {
    id: `scene_${Date.now()}`,
    name: 'Default Scene',
    background: [],  // Empty background initially
    quadrants: new Map(),
    overlay: [],     // Empty overlay initially
    metadata: {
      template: 'default',
      version: '1.0'
    }
  };

  // Define the four standard quadrants
  const quadrants: [QuadrantId, Quadrant][] = [
    [1, {
      id: 1,
      name: 'Top Left',
      bounds: { left: 0, top: 0, right: halfWidth, bottom: halfHeight },
      padding: 20,
      assets: []
    }],
    [2, {
      id: 2,
      name: 'Top Right',
      bounds: { left: halfWidth, top: 0, right: width, bottom: halfHeight },
      padding: 20,
      assets: []
    }],
    [3, {
      id: 3,
      name: 'Bottom Left',
      bounds: { left: 0, top: halfHeight, right: halfWidth, bottom: height },
      padding: 20,
      assets: []
    }],
    [4, {
      id: 4,
      name: 'Bottom Right',
      bounds: { left: halfWidth, top: halfHeight, right: width, bottom: height },
      padding: 20,
      assets: []
    }]
  ];

  scene.quadrants = new Map(quadrants);

  return scene;
} 