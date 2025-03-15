import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import { PreviewServer } from '../monitoring/preview.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { stateManager } from '../../state/state-manager.js';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get PreviewServer instance but don't initialize yet
const previewServer = PreviewServer.getInstance();

// Create a single router for all stream endpoints
const streamRouter = express.Router();

// Add JSON body parser middleware
streamRouter.use(express.json());

// Get stream status
streamRouter.get('/status', (_req: Request, res: Response) => {
  try {
    const streamState = stateManager.getStreamState();
    if (!streamState) {
      throw new Error('Stream state not loaded');
    }
    
    res.json({
      success: true,
      data: streamState
    });
  } catch (error) {
    logger.error('Failed to get stream status', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get stream status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stream control endpoints
streamRouter.post('/start', async (_req: Request, res: Response) => {
  try {
    logger.info('Starting stream');
    
    const currentState = stateManager.getStreamState();
    if (!currentState) {
      throw new Error('Stream state not loaded');
    }

    if (currentState.isLive) {
      logger.warn('Stream is already running');
      return res.status(400).json({
        success: false,
        error: 'Stream is already running',
        details: { state: currentState }
      });
    }

    await previewServer.start();
    
    // Update state after successful start
    await stateManager.updateStreamState({
      ...currentState,
      isLive: true,
      startTime: Date.now()
    });
    
    // Get updated state
    const newState = stateManager.getStreamState();
    logger.info('Stream started successfully', { state: newState });
    
    res.json({ 
      success: true,
      data: newState
    });
  } catch (error) {
    logger.error('Failed to start stream', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      error: 'Failed to start stream',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

streamRouter.post('/stop', async (_req: Request, res: Response) => {
  try {
    logger.info('Stopping stream');
    
    const currentState = stateManager.getStreamState();
    logger.info('Current state before stop:', { state: currentState });

    if (!currentState.isLive) {
      logger.warn('Stream is not running');
      return res.status(400).json({
        success: false,
        error: 'Stream is not running'
      });
    }

    await previewServer.stop();
    logger.info('Preview streaming stopped');
    
    // Update state to reflect stopped stream
    await stateManager.updateStreamState({
      ...currentState,
      isLive: false,
      isPaused: false,
      fps: 0,
      frameCount: 0,
      droppedFrames: 0,
      averageRenderTime: 0,
      startTime: null
    });
    
    // Get and verify the updated state
    const verifyState = stateManager.getStreamState();
    logger.info('State after stop:', { state: verifyState });
    
    res.json({ 
      success: true,
      data: verifyState
    });
  } catch (error) {
    logger.error('Failed to stop stream', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      error: 'Failed to stop stream',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Config endpoint
streamRouter.get('/config', (req: Request, res: Response) => {
  try {
    logger.info('Config request received');
    
    const publicConfig = {
      STREAM_RESOLUTION: config['STREAM_RESOLUTION'],
      TARGET_FPS: config['TARGET_FPS'],
      RENDER_QUALITY: config['RENDER_QUALITY'],
      MAX_LAYERS: config['MAX_LAYERS'],
      STREAM_BITRATE: config['STREAM_BITRATE'],
      ENABLE_HARDWARE_ACCELERATION: config['ENABLE_HARDWARE_ACCELERATION']
    };

    logger.info('Sending config response', { config: publicConfig });
    res.json(publicConfig);
  } catch (error) {
    logger.error('Error serving config', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ error: 'Failed to get stream configuration' });
  }
});

// Frame endpoint
streamRouter.get('/frame', (req: Request, res: Response) => {
  try {
    const streamState = stateManager.getStreamState();
    if (!streamState.isLive) {
      return res.status(404).json({
        success: false,
        error: 'Stream is not live'
      });
    }

    const frame = previewServer['lastFrameBuffer'];
    if (!frame) {
      return res.status(404).json({
        success: false,
        error: 'No frame available'
      });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(frame);
  } catch (error) {
    logger.error('Error getting frame', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get frame'
    });
  }
});

// Error handler for stream routes
streamRouter.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Express error handler', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  res.status(500).json({ error: 'Internal server error' });
});

// Export the setup function that mounts the router
export async function setupStreamServer(app: express.Application) {
  try {
    logger.info('Stream server setup started');
    
    // Initialize preview server first
    await previewServer.initialize();
    logger.info('Preview server initialized');
    
    // Mount the stream router under /stream path
    app.use('/stream', streamRouter);
    
    // Log all routes that were mounted
    streamRouter.stack.forEach((r: any) => {
      if (r.route && r.route.path) {
        logger.info('Mounted stream route:', {
          path: `/stream${r.route.path}`,
          methods: Object.keys(r.route.methods)
        });
      }
    });
    
    logger.info('Stream server setup complete');
  } catch (error) {
    logger.error('Stream server setup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Export the router for direct use if needed
export default streamRouter;