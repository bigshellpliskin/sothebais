import express from 'express';
import type { Request, Response } from 'express';
import { logger } from './utils/logger.js';
import { loadConfig } from './config/index.js';

// TODO: Import core components once prototype in generate-test-stream.ts is ready
// import { StreamManager } from './streaming/stream-manager.js';
// import { stateManager } from './state/state-manager.js';
// etc...

// Load configuration first
const loadedConfig = await loadConfig();

// Initialize logger early
logger.initialize(loadedConfig);

async function startServer() {
  try {
    // TODO: Move initialization logic from generate-test-stream.ts here once prototype is stable
    // Current prototype implementation can be found in:
    // src/tools/debug/generate-test-stream.ts

    const app = express();
    app.use(express.json());

    // Basic health check endpoint
    app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    // Start HTTP server
    const port = loadedConfig.PORT || 4200;
    app.listen(port, '0.0.0.0', () => {
      logger.info('Stream Manager development server ready', {
        port,
        status: 'development'
      });
    });

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