import express from 'express';
import type { Request, Response } from 'express';
import { logger } from './utils/logger.js';
import { loadConfig } from './config/index.js';
import { StreamManager } from './streaming/stream-manager.js';
import { stateManager } from './state/state-manager.js';
import { AssetManager } from './core/assets.js';
import { CompositionEngine } from './core/composition.js';
import { createDefaultScene } from './scenes/default-scene.js';
import type {
  Asset,
  Canvas
} from './types/index.js';
import type {
  AssetManager as AssetManagerInterface,
  CompositionEngine as CompositionEngineInterface,
  CompositionEngineStatic,
  AssetManagerStatic,
} from '@sothebais/shared/types/scene.js';

// TODO: Import core components once prototype in generate-test-stream.ts is ready
// import { StreamManager } from './streaming/stream-manager.js';
// import { stateManager } from './state/state-manager.js';
// etc...

// Load configuration first
const loadedConfig = await loadConfig();

// Initialize logger with config context
logger.info('Starting Stream Manager', { config: { 
  resolution: loadedConfig.STREAM_RESOLUTION,
  fps: loadedConfig.TARGET_FPS,
  environment: process.env['NODE_ENV'] || 'development'
}});

async function initializeCoreComponents() {
  logger.info('Initializing core components...');

  // Get resolution from config
  const { width, height } = loadedConfig.STREAM_RESOLUTION;

  // Initialize managers
  const assets = AssetManager.getInstance() as AssetManagerInterface;
  const composition = CompositionEngine.getInstance(loadedConfig) as CompositionEngineInterface;

  // Update composition dimensions
  composition.updateDimensions(width, height);

  logger.info('Core components initialized');

  return { assets, composition };
}

async function startServer() {
  try {
    // Initialize core components
    const { assets, composition } = await initializeCoreComponents();

    // Create default scene
    const scene = createDefaultScene(loadedConfig);

    // Initialize stream manager
    const streamManager = StreamManager.getInstance();
    await streamManager.initialize(loadedConfig, {
      assets,
      composition,
      currentScene: scene
    });

    const app = express();
    app.use(express.json());

    // Basic health check endpoint
    app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    // Stream status endpoint for health checks
    app.get('/stream/status', (_req: Request, res: Response) => {
      const state = stateManager.getStreamState();
      res.json({
        status: 'ok',
        isLive: state.isLive,
        metrics: streamManager.getMetrics()
      });
    });

    // Start HTTP server
    const port = loadedConfig.PORT || 4200;
    app.listen(port, '0.0.0.0', () => {
      logger.info('Stream Manager server ready', {
        port,
        status: process.env['NODE_ENV'] || 'development'
      });
    });

    // Start the stream manager
    await streamManager.start();
    logger.info('Stream manager started successfully');

    // Setup cleanup handlers
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Cleanup function
    async function cleanup() {
      logger.info('Shutting down gracefully...');
      await streamManager.cleanup();
      process.exit(0);
    }

  } catch (error) {
    logger.error('Stream Manager failed to start', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'failed'
    });
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  // TODO: Add cleanup logic once core services are moved from generate-test-stream.ts
  process.exit(0);
}); 