import type { Scene, QuadrantId, Quadrant, Asset } from '../types/core.js';
import type { Config } from '../types/config.js';
import path from 'path';

export function createDefaultScene(config: Config): Scene {
  const [width, height] = config.STREAM_RESOLUTION.split('x').map(Number);
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // Create background asset
  const backgroundAsset: Asset = {
    id: 'default_bg',
    type: 'image',
    source: path.join(process.cwd(), 'assets', 'bgs', 'layoutFull-BG.png'),
    position: { x: 0, y: 0 },
    transform: {
      scale: 1,
      rotation: 0,
      opacity: 1,
      anchor: { x: 0.5, y: 0.5 }
    },
    visible: true,
    zIndex: 0
  };

  // Create character asset
  const auctioneerAsset: Asset = {
    id: 'auctioneer',
    type: 'image',
    source: path.join(process.cwd(), 'assets', 'characters', 'auctioneer.png'),
    position: { x: halfWidth + 50, y: halfHeight + 50 },  // Position in bottom right quadrant
    transform: {
      scale: 0.8,
      rotation: 0,
      opacity: 1,
      anchor: { x: 0.5, y: 0.5 }
    },
    visible: true,
    zIndex: 1
  };

  // Create a basic scene with 4 quadrants
  const scene: Scene = {
    id: `scene_${Date.now()}`,
    name: 'Default Scene',
    background: [backgroundAsset],  // Add background asset
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
      assets: [auctioneerAsset]  // Add auctioneer to bottom right quadrant
    }]
  ];

  scene.quadrants = new Map(quadrants);

  return scene;
} 