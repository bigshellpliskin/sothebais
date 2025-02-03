import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createTestLayers } from './test-layers.js';
import { layerRenderer } from '../services/layer-renderer.js';
import { layerManager } from '../services/layer-manager.js';
import { logger } from '../utils/logger.js';
import type { ChatMessage, ChatLayer } from '../types/layers.js';
import type { LogContext } from '../utils/logger.js';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupDemoServer(app: express.Application) {
  try {
    // Initialize layer manager
    await layerManager.initialize();

    // Serve static assets with proper path resolution
    const assetsPath = path.join(process.cwd(), 'assets');
    logger.info('Starting demo server', {
      assetsPath
    } as LogContext);
    app.use('/assets', express.static(assetsPath));

    // Initialize layer renderer with 1080p resolution
    layerRenderer.initialize({
      width: 1920,
      height: 1080,
      targetFPS: 30
    });

    // Create test layers
    try {
      await createTestLayers();
    } catch (error) {
      logger.error('Failed to create test layers', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      } as LogContext);
      process.exit(1);
    }

    // Start render loop
    try {
      layerRenderer.startRenderLoop();
    } catch (error) {
      logger.error('Failed to start render loop', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      } as LogContext);
      process.exit(1);
    }

    // Serve a simple HTML page to view the output
    app.get('/demo', (req: Request, res: Response) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Stream Manager Demo</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                background: #1a1a1a;
                color: white;
                font-family: Arial, sans-serif;
              }
              .container {
                max-width: 1920px;
                margin: 0 auto;
              }
              .canvas-container {
                position: relative;
                width: 100%;
                background: #000;
                border: 2px solid #333;
                border-radius: 4px;
                overflow: hidden;
              }
              canvas {
                width: 100%;
                height: auto;
                display: block;
              }
              .controls {
                margin-top: 20px;
                padding: 20px;
                background: #333;
                border-radius: 4px;
              }
              .chat-controls {
                margin-top: 20px;
                padding: 20px;
                background: #444;
                border-radius: 4px;
              }
              button {
                padding: 10px 20px;
                margin: 0 10px;
                border: none;
                border-radius: 4px;
                background: #0066cc;
                color: white;
                cursor: pointer;
              }
              button:hover {
                background: #0052a3;
              }
              input[type="text"] {
                padding: 10px;
                margin: 0 10px;
                border: none;
                border-radius: 4px;
                width: 300px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Stream Manager Demo</h1>
              <div class="canvas-container">
                <canvas id="output"></canvas>
              </div>
              <div class="controls">
                <button onclick="toggleLayer('host')">Toggle Host</button>
                <button onclick="toggleLayer('nft')">Toggle NFT</button>
                <button onclick="toggleLayer('shape')">Toggle Shape</button>
                <button onclick="toggleLayer('text')">Toggle Text</button>
                <button onclick="toggleLayer('chat')">Toggle Chat</button>
              </div>
              <div class="chat-controls">
                <input type="text" id="chatMessage" placeholder="Type a message...">
                <button onclick="sendChatMessage()">Send Message</button>
                <button onclick="sendHighlightedMessage()">Send Bid</button>
              </div>
            </div>
            <script>
              const canvas = document.getElementById('output');
              const ctx = canvas.getContext('2d');
              
              // Set canvas size
              canvas.width = 1920;
              canvas.height = 1080;

              // Function to toggle layer visibility
              async function toggleLayer(type) {
                try {
                  const response = await fetch(\`/demo/toggle/\${type}\`, { method: 'POST' });
                  if (!response.ok) throw new Error('Failed to toggle layer');
                } catch (error) {
                  console.error('Error toggling layer:', error);
                }
              }

              // Function to send chat message
              async function sendChatMessage(highlighted = false) {
                const input = document.getElementById('chatMessage');
                const text = input.value.trim();
                if (!text) return;

                try {
                  const response = await fetch('/demo/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, highlighted })
                  });
                  if (!response.ok) throw new Error('Failed to send message');
                  input.value = '';
                } catch (error) {
                  console.error('Error sending message:', error);
                }
              }

              // Function to send highlighted message (bid)
              function sendHighlightedMessage() {
                sendChatMessage(true);
              }

              // Function to update canvas
              async function updateCanvas() {
                try {
                  const response = await fetch('/demo/frame');
                  const blob = await response.blob();
                  const img = new Image();
                  img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                  };
                  img.src = URL.createObjectURL(blob);
                } catch (error) {
                  console.error('Error updating canvas:', error);
                }
              }

              // Update canvas every frame
              setInterval(updateCanvas, 1000 / 30);
            </script>
          </body>
        </html>
      `);
    });

    // Endpoint to get the current frame
    app.get('/demo/frame', (req: Request, res: Response) => {
      try {
        const canvas = layerRenderer.getCanvas();
        const buffer = canvas.toBuffer('image/png');
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);
      } catch (error) {
        logger.error('Error serving frame', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        } as LogContext);
        res.status(500).send('Error generating frame');
      }
    });

    // Endpoint to toggle layer visibility
    app.post('/api/stream/toggle/:type', async (req: Request, res: Response) => {
      const { type } = req.params;
      try {
        const layers = layerManager.getAllLayers();
        const layer = layers.find(l => {
          switch (type) {
            case 'host': return l.type === 'host';
            case 'nft': return l.type === 'visualFeed';
            case 'shape': return l.type === 'overlay';
            case 'text': return l.type === 'overlay';
            case 'chat': return l.type === 'chat';
            default: return false;
          }
        });

        if (!layer) {
          logger.warn('Layer not found for toggle', {
            type
          } as LogContext);
          res.status(404).json({ error: 'Layer not found' });
          return;
        }

        layerManager.setLayerVisibility(layer.id, !layer.visible);
        logger.info('Layer visibility toggled', {
          layerId: layer.id,
          type: layer.type,
          visible: !layer.visible
        } as LogContext);
        res.json({ success: true });
      } catch (error) {
        logger.error('Failed to toggle layer', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          type
        } as LogContext);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Endpoint to add chat message
    app.post('/demo/chat', async (req: Request, res: Response) => {
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

    logger.info('Demo server setup complete');

    // Error handler
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Express error handler', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
      } as LogContext);
      res.status(500).json({ error: 'Internal server error' });
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logger.info('Demo server started', {
        port,
        assetsPath
      } as LogContext);
    }).on('error', (error) => {
      logger.error('Failed to start demo server', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        port
      } as LogContext);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Demo server setup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    } as LogContext);
    process.exit(1);
  }
} 