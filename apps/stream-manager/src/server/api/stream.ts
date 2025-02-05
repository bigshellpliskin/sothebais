import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { StreamManager } from '../pipeline/stream-manager.js';
import { layerRenderer } from '../pipeline/layer-renderer.js';
import { NewLayerManager } from '../services/new-layer-manager.js';
import { logger } from '../utils/logger.js';
import type { ChatMessage, ChatContent, GenericLayer, Layer } from '../types/layers.js';
import type { LogContext } from '../utils/logger.js';
import sharp from 'sharp';
import { getConfig } from '../config/index.js';
import { setupDefaultLayers } from '../services/default-layers.js';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let streamManager: StreamManager;
const newLayerManager = NewLayerManager.getInstance();

export async function setupStreamServer(app: express.Application) {
  try {
    // Initialize layer manager and create default layers
    await setupDefaultLayers();
    
    // Add JSON body parser middleware for stream routes
    const streamRouter = express.Router();
    streamRouter.use(express.json());

    // Mount the stream router under /stream path
    app.use('/stream', streamRouter);

    // Add config endpoint
    streamRouter.get('/config', (req: Request, res: Response) => {
      try {
        const config = getConfig();
        logger.info('Config request received');
        
        const publicConfig = {
          STREAM_RESOLUTION: config.STREAM_RESOLUTION,
          TARGET_FPS: config.TARGET_FPS,
          RENDER_QUALITY: config.RENDER_QUALITY,
          MAX_LAYERS: config.MAX_LAYERS,
          AUDIO_BITRATE: config.AUDIO_BITRATE,
          AUDIO_ENABLED: config.AUDIO_ENABLED,
          STREAM_BITRATE: config.STREAM_BITRATE
        };

        logger.info('Sending config response', { config: publicConfig } as LogContext);
        res.json(publicConfig);
      } catch (error) {
        logger.error('Error serving config', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        } as LogContext);
        res.status(500).json({ error: 'Failed to get stream configuration' });
      }
    });

    // Initialize and start the stream manager
    try {
      streamManager = StreamManager.getInstance();
      await streamManager.start();
      
      const config = getConfig();
      logger.info('Stream manager started', {
        resolution: config.STREAM_RESOLUTION,
        fps: config.TARGET_FPS,
        bitrate: config.STREAM_BITRATE
      } as LogContext);
    } catch (error) {
      logger.error('Failed to start stream manager', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      } as LogContext);
      process.exit(1);
    }

    // Add status endpoint
    streamRouter.get('/status', (req: Request, res: Response) => {
      try {
        const metrics = streamManager.getMetrics();
        if (!metrics) {
          logger.error('Failed to get stream metrics');
          return res.status(500).json({
            success: false,
            error: 'Failed to get stream metrics'
          });
        }

        const status = {
          success: true,
          data: {
            isLive: metrics.isStreaming,
            fps: metrics.currentFPS || 0,
            targetFPS: 30, // Default target FPS
            layerCount: newLayerManager.getAllLayers().length,
            averageRenderTime: 0, // Default render time
            isPaused: false
          }
        };

        logger.info('Status request successful', status);
        res.json(status);
      } catch (error) {
        logger.error('Error getting stream status', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({
          success: false,
          error: 'Failed to get stream status'
        });
      }
    });

    // Endpoint to get the current frame
    streamRouter.get('/frame', async (req: Request, res: Response) => {
      try {
        const metrics = streamManager.getMetrics();
        logger.info('Frame request received', {
          isStreaming: metrics.isStreaming,
          fps: metrics.currentFPS,
          layerCount: newLayerManager.getAllLayers().length
        } as LogContext);

        if (!metrics.isStreaming) {
          logger.info('Stream not active, returning black frame');
          // Return a black frame if not streaming
          const blackFrame = await sharp({
            create: {
              width: 1280,
              height: 720,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 1 }
            }
          }).png().toBuffer();
          res.setHeader('Content-Type', 'image/png');
          res.send(blackFrame);
          return;
        }

        // Get the current frame from the stream manager
        const layers = newLayerManager.getAllLayers();
        logger.info('Retrieved layers for compositing', {
          layerCount: layers.length,
          layerTypes: layers.map(l => l.content.type),
          layerVisibility: layers.map(l => ({ type: l.content.type, visible: l.visible }))
        } as LogContext);

        // Log layer details before compositing
        layers.forEach(layer => {
          logger.info('Layer details', {
            id: layer.id,
            type: layer.content.type,
            visible: layer.visible,
            opacity: layer.opacity,
            transform: layer.transform,
            content: layer.content.type === 'image' ? {
              ...layer.content,
              data: layer.content.data
            } : 'content-omitted'
          } as LogContext);
        });

        logger.info('Attempting to composite layers...');
        const composited = await layerRenderer.renderFrame(1280, 720);
        logger.info('Layers composited successfully', {
          compositedBuffer: composited ? 'buffer-present' : 'buffer-missing',
          bufferSize: composited?.length
        } as LogContext);

        logger.info('Resizing and converting to PNG...');
        const pngBuffer = await sharp(composited)
          .resize(1280, 720)
          .png()
          .toBuffer();

        logger.info('Frame generated successfully', {
          pngSize: pngBuffer.length
        } as LogContext);

        res.setHeader('Content-Type', 'image/png');
        res.send(pngBuffer);
      } catch (error) {
        logger.error('Error serving frame', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          phase: error instanceof Error && error.message.includes('composite') ? 'compositing' : 
                error instanceof Error && error.message.includes('resize') ? 'resizing' : 'unknown'
        } as LogContext);
        res.status(500).json({
          error: 'Error generating frame',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // New Layer Management API Endpoints
    streamRouter.get('/layers', (req: Request, res: Response) => {
      try {
        logger.info('Fetching all layers from NewLayerManager');
        const layers = newLayerManager.getAllLayers();
        
        if (!layers) {
          logger.error('NewLayerManager returned null or undefined layers');
          return res.status(500).json({
            success: false,
            error: 'Layer manager not properly initialized',
            details: 'Layer manager returned null or undefined'
          });
        }

        // Ensure we're returning a valid array
        if (!Array.isArray(layers)) {
          logger.error('NewLayerManager returned non-array value', {
            returnType: typeof layers,
            value: layers
          } as LogContext);
          return res.status(500).json({
            success: false,
            error: 'Invalid layer data format',
            details: 'Expected array of layers'
          });
        }

        // Ensure proper content type
        res.setHeader('Content-Type', 'application/json');
        
        // Return the layers with proper structure
        res.json({
          success: true,
          data: layers,
          count: layers.length
        });
      } catch (error) {
        logger.error('Failed to get layers from NewLayerManager:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          type: error instanceof Error ? error.constructor.name : typeof error
        } as LogContext);

        // Ensure proper content type even for errors
        res.setHeader('Content-Type', 'application/json');
        
        res.status(500).json({
          success: false,
          error: 'Failed to fetch layer states',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Layer visibility endpoint
    streamRouter.post('/layers/:id/visibility', async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { visible } = req.body;

        if (typeof visible !== 'boolean') {
          return res.status(400).json({
            success: false,
            error: 'Visibility must be a boolean'
          });
        }

        const success = newLayerManager.setLayerVisibility(id, visible);
        if (!success) {
          return res.status(404).json({
            success: false,
            error: 'Layer not found'
          });
        }

        const layer = newLayerManager.getLayer(id);
        res.json({
          success: true,
          data: layer
        });
      } catch (error) {
        logger.error('Error setting layer visibility', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        } as LogContext);
        res.status(500).json({
          success: false,
          error: 'Failed to set layer visibility'
        });
      }
    });

    // Layer batch update endpoint
    streamRouter.post('/layers/update', async (req: Request, res: Response) => {
      try {
        const { updates } = req.body;

        if (!Array.isArray(updates)) {
          return res.status(400).json({
            success: false,
            error: 'Updates must be an array'
          });
        }

        const results = await Promise.all(updates.map(async (update) => {
          const success = newLayerManager.setLayerVisibility(update.id, update.visible);
          return {
            id: update.id,
            success,
            error: success ? undefined : 'Layer not found'
          };
        }));

        const allSuccessful = results.every(r => r.success);
        const layerCount = newLayerManager.getAllLayers().length;

        res.json({
          success: allSuccessful,
          data: {
            results,
            layerCount
          }
        });
      } catch (error) {
        logger.error('Error processing batch update', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        } as LogContext);
        res.status(500).json({
          success: false,
          error: 'Failed to process batch update'
        });
      }
    });

    // Stream playback endpoints
    streamRouter.post('/playback/:action', async (req: Request, res: Response) => {
      try {
        const { action } = req.params;
        
        if (!['start', 'stop'].includes(action)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Must be either "start" or "stop"'
          });
        }

        logger.info('Stream playback request received', {
          action,
          currentState: streamManager.getMetrics().isStreaming
        } as LogContext);

        if (action === 'start') {
          if (streamManager.getMetrics().isStreaming) {
            return res.status(400).json({
              success: false,
              error: 'Stream is already running'
            });
          }
          await streamManager.start();
        } else {
          if (!streamManager.getMetrics().isStreaming) {
            return res.status(400).json({
              success: false,
              error: 'Stream is not running'
            });
          }
          await streamManager.stop();
        }

        const metrics = streamManager.getMetrics();
        logger.info('Stream playback action completed', {
          action,
          isStreaming: metrics.isStreaming,
          fps: metrics.currentFPS
        } as LogContext);

        res.json({
          success: true,
          data: {
            isStreaming: metrics.isStreaming,
            fps: metrics.currentFPS || 0
          }
        });
      } catch (error) {
        logger.error('Error controlling stream playback', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        } as LogContext);
        res.status(500).json({
          success: false,
          error: 'Failed to control stream playback'
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
      } as LogContext);
      res.status(500).json({ error: 'Internal server error' });
    });
  } catch (error) {
    logger.error('Stream server setup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    } as LogContext);
    process.exit(1);
  }
}