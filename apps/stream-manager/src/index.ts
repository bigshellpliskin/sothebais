import express from 'express';
import type { Request, Response } from 'express';
import { logger } from './utils/logger.js';
import { config, loadConfig } from './config/index.js';
import { setupStreamServer } from './server/api/stream.js';
import { Registry, collectDefaultMetrics } from 'prom-client';
import { redisService } from './state/redis-service.js';
import { stateManager } from './state/state-manager.js';
import { webSocketService } from './server/websocket.js';
import { WorkerPoolManager } from './workers/pool/manager.js';
import { CompositionEngine } from './core/composition.js';
import { ViewportManager } from './core/viewport.js';
import { AssetManager } from './core/assets.js';
import { LayoutManager } from './core/layout.js';
import type { 
  ViewportManagerStatic, 
  AssetManagerStatic, 
  LayoutManagerStatic,
  CompositionEngineStatic,
  WorkerPoolManagerStatic,
  ViewportManager as IViewportManager,
  AssetManager as IAssetManager,
  LayoutManager as ILayoutManager,
  CompositionEngine as ICompositionEngine,
  WorkerPoolManager as IWorkerPoolManager
} from './types/core.js';
import type { WorkerPoolConfig } from './types/config.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load configuration first
const loadedConfig = await loadConfig();

// Initialize logger early
logger.initialize(loadedConfig);

// Create a Registry to register metrics
const register = new Registry();

// Enable default metrics collection with service label
collectDefaultMetrics({
  register,
  labels: { service: 'stream-manager' }
});

// Create metrics server
const metricsApp = express();

metricsApp.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await register.metrics();
    res.set('Content-Type', register.contentType);
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err);
  }
});

metricsApp.listen(loadedConfig.METRICS_PORT, () => {
  logger.info(`Metrics server listening on port ${loadedConfig.METRICS_PORT}`);
});

async function startServer() {
  try {
    // Initialize core services in order
    logger.info('Initializing core services...');

    // 1. Initialize Redis and State
    await redisService.initialize(loadedConfig);
    logger.info('Redis service initialized');

    await stateManager.loadState();
    logger.info('State manager initialized and state loaded');

    // 2. Initialize Core Domain Services
    const ViewportManagerClass = ViewportManager as unknown as ViewportManagerStatic;
    const viewport = await ViewportManagerClass.initialize(loadedConfig);
    logger.info('Viewport manager initialized');

    const AssetManagerClass = AssetManager as unknown as AssetManagerStatic;
    const assets = await AssetManagerClass.initialize(loadedConfig);
    logger.info('Asset manager initialized');

    const LayoutManagerClass = LayoutManager as unknown as LayoutManagerStatic;
    const layout = await LayoutManagerClass.initialize(loadedConfig);
    logger.info('Layout manager initialized');

    const CompositionEngineClass = CompositionEngine as unknown as CompositionEngineStatic;
    const composition = await CompositionEngineClass.initialize({
      viewport,
      assets,
      layout
    });
    logger.info('Composition engine initialized');

    // 3. Initialize Worker System
    const workerPoolConfig: WorkerPoolConfig = {
      poolSize: loadedConfig.WORKER_POOL_SIZE,
      taskQueueSize: loadedConfig.WORKER_QUEUE_SIZE,
      taskTimeout: loadedConfig.WORKER_TASK_TIMEOUT
    };

    const WorkerPoolManagerClass = WorkerPoolManager as unknown as WorkerPoolManagerStatic;
    const workerPool = await WorkerPoolManagerClass.initialize(workerPoolConfig);
    logger.info('Worker pool initialized');

    // 4. Create Express app and setup middleware
    const app = express();
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../public')));

    // Add request logging middleware
    app.use((req: Request, res: Response, next) => {
      next();
    });

    // 5. Set up stream server routes
    logger.info('Setting up stream server routes');
    await setupStreamServer(app);
    logger.info('Stream server routes configured');

    // Log all registered routes
    app._router.stack.forEach((r: any) => {
      if (r.route && r.route.path) {
        logger.info('Registered route:', {
          path: r.route.path,
          methods: Object.keys(r.route.methods)
        });
      }
    });

    // 6. Start HTTP server
    const httpServer = app.listen(loadedConfig.PORT, '0.0.0.0', () => {
      logger.info('HTTP endpoint ready', {
        service: 'http',
        port: loadedConfig.PORT,
        address: '0.0.0.0',
        protocol: 'http'
      });
    });

    // 7. Initialize WebSocket service with dependencies
    await webSocketService.initialize();
    logger.info('WebSocket service initialized', {
      port: 4201
    });

    // Log endpoints configuration
    logger.info('Service endpoints configured', {
      endpoints: {
        http: { port: loadedConfig.PORT, protocol: 'http' },
        metrics: { port: loadedConfig.METRICS_PORT, protocol: 'http' },
        ws: { port: 4201, protocol: 'ws' }
      },
      status: 'ready'
    });

    logger.info('Stream Manager ready', {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed
    });

  } catch (error) {
    logger.error('Stream Manager failed to start', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'failed',
      code: 1
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
process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...', {
    status: 'shutdown_initiated',
    uptime: process.uptime()
  });
  try {
    // Save final state
    await stateManager.saveState();
    logger.info('Final state saved');

    // Get instances with proper type assertions
    const compositionEngine = ((CompositionEngine as unknown as CompositionEngineStatic).getInstance() as unknown) as ICompositionEngine;
    const workerPool = ((WorkerPoolManager as unknown as WorkerPoolManagerStatic).getInstance() as unknown) as IWorkerPoolManager;
    const viewport = ((ViewportManager as unknown as ViewportManagerStatic).getInstance() as unknown) as IViewportManager;
    const assets = ((AssetManager as unknown as AssetManagerStatic).getInstance() as unknown) as IAssetManager;
    const layout = ((LayoutManager as unknown as LayoutManagerStatic).getInstance() as unknown) as ILayoutManager;

    // Cleanup core services
    await Promise.all([
      compositionEngine.cleanup(),
      workerPool.cleanup(),
      viewport.cleanup(),
      assets.cleanup(),
      layout.cleanup()
    ]);
    logger.info('Core services cleaned up');

    // Disconnect Redis
    await redisService.disconnect();
    logger.info('Redis disconnected');

    logger.info('Shutdown complete', {
      status: 'shutdown_complete',
      code: 0
    });
    process.exit(0);
  } catch (error) {
    logger.error('Shutdown failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'shutdown_failed',
      code: 1
    });
    process.exit(1);
  }
}); 