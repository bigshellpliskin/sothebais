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

export async function setupStreamServer(app: express.Application) {
  try {
    // Add JSON body parser middleware for stream routes
    const streamRouter = express.Router();
    streamRouter.use(express.json());

    // Mount the stream router under /stream path
    app.use('/stream', streamRouter);

    // Add config endpoint
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

    // Initialize preview server
    try {
      logger.info('Stream server setup started');
    } catch (error) {
      logger.error('Failed to start stream server', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      process.exit(1);
    }

    // Layer Management Endpoints
    streamRouter.get('/layers', (req: Request, res: Response) => {
      try {
        logger.info('Fetching layers');
        res.json({
          success: true,
          data: layers,
          count: layers.length
        });
      } catch (error) {
        logger.error('Error fetching layers', { error });
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

    // Add status endpoint
    streamRouter.get('/status', (req: Request, res: Response) => {
      try {
        const status = previewServer.getStatus();
        res.json({
          success: true,
          data: status
        });
      } catch (error) {
        logger.error('Error getting stream status', { error });
        res.status(500).json({
          success: false,
          error: 'Failed to get stream status'
        });
      }
    });

    // Endpoint to get the current frame
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

    // Stream playback endpoints
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

    logger.info('Stream server setup complete');

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
  } catch (error) {
    logger.error('Stream server setup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

const router = Router();

// Get stream status
router.get('/status', (req, res) => {
  try {
    const status = previewServer.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting stream status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get stream status'
    });
  }
});

// Get current frame
router.get('/frame', (req, res) => {
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

// Start streaming
router.post('/start', (req, res) => {
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

// Stop streaming
router.post('/stop', (req, res) => {
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

export default router;