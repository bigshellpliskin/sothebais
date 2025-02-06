import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import { PreviewServer } from '../monitoring/preview.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get PreviewServer instance but don't initialize yet
const previewServer = PreviewServer.getInstance();

// Mock layers for initial implementation
const defaultLayers = [
  {
    id: 'background',
    name: 'Background',
    visible: true,
    content: {
      type: 'color',
      data: '#000000'
    }
  },
  {
    id: 'overlay',
    name: 'Overlay',
    visible: true,
    content: {
      type: 'image',
      data: '/overlay.png'
    }
  }
];

let layers = [...defaultLayers];

// Create a single router for all stream endpoints
const streamRouter = express.Router();

// Add JSON body parser middleware
streamRouter.use(express.json());

// Layer Management Endpoints
streamRouter.get('/layers', (req: Request, res: Response) => {
  try {
    logger.info('=== Layer Request Received ===', {
      method: req.method,
      path: req.path,
      headers: req.headers,
      query: req.query,
      url: req.url,
      ip: req.ip
    });
    
    logger.info('Preparing layers response', {
      layerCount: layers.length,
      layers: layers.map(l => ({ id: l.id, name: l.name, visible: l.visible }))
    });
    
    res.json({
      success: true,
      data: layers,
      count: layers.length
    });

    logger.info('=== Layer Response Sent Successfully ===', {
      count: layers.length,
      responseStatus: res.statusCode
    });
  } catch (error) {
    logger.error('=== Layer Request Failed ===', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      path: req.path,
      method: req.method,
      headers: req.headers
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch layers'
    });
  }
});

// Layer visibility endpoint
streamRouter.post('/layers/:id/visibility', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { visible } = req.body;

    if (typeof visible !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Visibility must be a boolean'
      });
    }

    const layerIndex = layers.findIndex(layer => layer.id === id);
    if (layerIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Layer not found'
      });
    }

    layers[layerIndex] = {
      ...layers[layerIndex],
      visible
    };

    res.json({
      success: true,
      data: layers[layerIndex]
    });
  } catch (error) {
    logger.error('Error updating layer visibility', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update layer visibility'
    });
  }
});

// Config endpoint
streamRouter.get('/config', (req: Request, res: Response) => {
  try {
    logger.info('Config request received');
    
    const publicConfig = {
      STREAM_RESOLUTION: config.STREAM_RESOLUTION,
      TARGET_FPS: config.TARGET_FPS,
      RENDER_QUALITY: config.RENDER_QUALITY,
      MAX_LAYERS: config.MAX_LAYERS,
      STREAM_BITRATE: config.STREAM_BITRATE,
      ENABLE_HARDWARE_ACCELERATION: config.ENABLE_HARDWARE_ACCELERATION,
      METRICS_INTERVAL: config.METRICS_INTERVAL
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

// Status endpoint - minimal logging
streamRouter.get('/status', (req: Request, res: Response) => {
  try {
    const status = previewServer.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Status request failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get status'
    });
  }
});

// Frame endpoint
streamRouter.get('/frame', (req: Request, res: Response) => {
  try {
    const frame = previewServer.getCurrentFrame();
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
    logger.error('Error getting frame', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get frame'
    });
  }
});

// Stream control endpoints
streamRouter.post('/start', (req: Request, res: Response) => {
  try {
    previewServer.start();
    res.json({
      success: true,
      message: 'Stream started'
    });
  } catch (error) {
    logger.error('Error starting stream', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to start stream'
    });
  }
});

streamRouter.post('/stop', (req: Request, res: Response) => {
  try {
    previewServer.stop();
    res.json({
      success: true,
      message: 'Stream stopped'
    });
  } catch (error) {
    logger.error('Error stopping stream', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to stop stream'
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