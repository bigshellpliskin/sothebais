import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createDefaultLayers } from './default-layers.js';
import { streamManager } from '../pipeline/stream-manager.js';
import { sharpRenderer } from '../pipeline/sharp-renderer.js';
import { layerManager } from '../services/layer-manager.js';
import { logger } from '../utils/logger.js';
import type { ChatMessage, ChatLayer } from '../types/layers.js';
import type { LogContext } from '../utils/logger.js';
import sharp from 'sharp';
import { getConfig } from '../config/index.js';
import { StreamEncoder } from '../pipeline/stream-encoder.js';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupStreamServer(app: express.Application) {
  try {
    // Initialize layer manager and clear any existing state
    await layerManager.initialize();

    // Add JSON body parser middleware for stream routes
    const streamRouter = express.Router();
    streamRouter.use(express.json());

    // Mount the stream router under /stream path
    app.use('/stream', streamRouter);

    // Create test layers only if no layers exist
    try {
      const existingLayers = layerManager.getAllLayers();
      if (existingLayers.length === 0) {
        logger.info('No existing layers found, creating test layers');
        await createDefaultLayers();
      } else {
        logger.info('Using existing layers', {
          layerCount: existingLayers.length,
          types: existingLayers.map(l => l.type)
        } as LogContext);
      }
    } catch (error) {
      logger.error('Failed to create test layers', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      } as LogContext);
      process.exit(1);
    }

    // Initialize stream manager with default config
    try {
      const config = getConfig();
      const [width, height] = config.STREAM_RESOLUTION.split('x').map(Number);
      
      const streamConfig = {
        width,
        height,
        fps: config.TARGET_FPS,
        bitrate: config.STREAM_BITRATE,
        codec: config.STREAM_CODEC,
        preset: config.FFMPEG_PRESET,
        streamUrl: config.STREAM_URL
      };

      StreamEncoder.initialize(streamConfig);
      await streamManager.start();
      
      logger.info('Stream manager initialized and started', {
        resolution: `${width}x${height}`,
        fps: config.TARGET_FPS,
        bitrate: config.STREAM_BITRATE
      } as LogContext);
    } catch (error) {
      logger.error('Failed to initialize stream manager', {
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
            layerCount: layerManager.getAllLayers().length,
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
          layerCount: layerManager.getAllLayers().length
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
        const layers = layerManager.getAllLayers();
        logger.info('Retrieved layers for compositing', {
          layerCount: layers.length,
          layerTypes: layers.map(l => l.type),
          layerVisibility: layers.map(l => ({ type: l.type, visible: l.visible }))
        } as LogContext);

        // Log layer details before compositing
        layers.forEach(layer => {
          logger.info('Layer details', {
            id: layer.id,
            type: layer.type,
            visible: layer.visible,
            opacity: layer.opacity,
            transform: layer.transform,
            content: layer.type === 'visualFeed' ? {
              ...layer.content,
              imageUrl: layer.content.imageUrl
            } : 'content-omitted'
          } as LogContext);
        });

        logger.info('Attempting to composite layers...');
        const composited = await sharpRenderer.composite(layers);
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

    // Add layer toggle endpoint
    streamRouter.post('/toggle/:type', async (req: Request, res: Response) => {
      logger.info('Toggle request received', {
        type: req.params.type,
        requestedVisibility: req.body.visible,
        requestBody: req.body
      } as LogContext);
      
      const { type } = req.params;
      const { visible } = req.body;

      try {
        // Get all layers
        const layers = layerManager.getAllLayers();
        logger.info('Current layer states', {
          layers: layers.map(l => ({
            id: l.id,
            type: l.type,
            visible: l.visible
          }))
        } as LogContext);
        
        // Find the layer to toggle based on type
        let targetLayer;
        switch (type) {
          case 'host':
            targetLayer = layers.find(l => l.type === 'host');
            break;
          case 'nft':
            targetLayer = layers.find(l => l.type === 'visualFeed');
            break;
          case 'overlay':
            targetLayer = layers.find(l => l.type === 'overlay');
            break;
          case 'chat':
            targetLayer = layers.find(l => l.type === 'chat');
            break;
          default:
            logger.error('Invalid layer type requested', {
              type,
              availableTypes: ['host', 'nft', 'overlay', 'chat']
            } as LogContext);
            return res.status(400).json({ error: `Invalid layer type: ${type}` });
        }

        if (!targetLayer) {
          logger.error('Target layer not found', {
            requestedType: type,
            availableLayers: layers.map(l => l.type)
          } as LogContext);
          return res.status(404).json({ error: `Layer not found: ${type}` });
        }

        logger.info('Found target layer', {
          id: targetLayer.id,
          type: targetLayer.type,
          currentVisibility: targetLayer.visible,
          requestedVisibility: visible
        } as LogContext);

        // Update layer visibility using the proper method
        layerManager.setLayerVisibility(targetLayer.id, visible);
        
        // Force state persistence
        await layerManager.saveState();
        
        // Get the updated layer to confirm its state
        const updatedLayer = layerManager.getLayer(targetLayer.id);
        
        logger.info('Layer visibility update complete', {
          type,
          requestedVisibility: visible,
          layerId: targetLayer.id,
          actualState: updatedLayer?.visible,
          success: true
        } as LogContext);

        const response = { 
          success: true,
          layer: {
            id: targetLayer.id,
            type,
            visible: updatedLayer?.visible ?? visible,
            actualState: updatedLayer?.visible
          }
        };

        logger.info('Sending response', { response } as LogContext);
        res.json(response);
      } catch (error) {
        console.error('Error in toggle endpoint:', error);
        logger.error('Failed to toggle layer', {
          error: error instanceof Error ? error.message : 'Unknown error',
          type,
          stack: error instanceof Error ? error.stack : undefined
        } as LogContext);
        res.status(500).json({ error: 'Failed to toggle layer' });
      }
    });

    // Endpoint to add chat message
    streamRouter.post('/chat', async (req: Request, res: Response) => {
      try {
        const { text, highlighted } = req.body;
        const chatLayer = layerManager.getAllLayers().find((l): l is ChatLayer => l.type === 'chat');
        
        if (!chatLayer) {
          res.status(404).json({ error: 'Chat layer not found' });
          return;
        }

        const message: ChatMessage = {
          id: uuidv4(),
          author: 'User',
          text,
          timestamp: Date.now(),
          highlighted: !!highlighted
        };

        const updatedMessages = [...chatLayer.content.messages, message].slice(-chatLayer.content.maxMessages);
        await layerManager.updateLayer<'chat'>(chatLayer.id, {
          content: {
            ...chatLayer.content,
            messages: updatedMessages
          }
        });

        res.json({ success: true });
      } catch (error) {
        logger.error('Failed to handle chat message', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        } as LogContext);
        res.status(500).json({ error: 'Internal server error' });
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