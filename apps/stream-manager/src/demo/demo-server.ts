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
    // Initialize layer manager and clear any existing state
    await layerManager.initialize();

    // Add JSON body parser middleware for demo routes
    const demoRouter = express.Router();
    demoRouter.use(express.json());

    // Mount the demo router under /demo path
    app.use('/demo', demoRouter);

    // Add stream control endpoint
    demoRouter.post('/control', async (req: Request, res: Response) => {
      logger.info('Stream control request received', {
        body: req.body,
        method: req.method,
        url: req.url
      } as LogContext);

      try {
        const { action } = req.body;
        
        if (!action || !['start', 'stop', 'pause'].includes(action)) {
          logger.error('Invalid stream control action', {
            action,
            validActions: ['start', 'stop', 'pause']
          } as LogContext);
          return res.status(400).json({ error: 'Invalid action' });
        }

        // Get initial health status
        const initialHealth = layerRenderer.getHealth();
        logger.info('Initial stream health', initialHealth as LogContext);

        switch (action) {
          case 'start':
            layerRenderer.startRenderLoop();
            break;
          case 'pause':
            layerRenderer.pauseRenderLoop();
            break;
          case 'stop':
            layerRenderer.stopRenderLoop();
            break;
        }

        // Wait a short time for the status to update
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get updated health status
        const health = layerRenderer.getHealth();
        const isLive = health.status === 'healthy';

        logger.info('Stream control action completed', {
          action,
          status: health.status,
          fps: health.fps,
          isLive,
          isPaused: health.isPaused,
          renderTime: health.averageRenderTime
        } as LogContext);

        res.json({
          success: true,
          status: health.status,
          fps: health.fps,
          isLive,
          isPaused: health.isPaused,
          averageRenderTime: health.averageRenderTime
        });
      } catch (error) {
        logger.error('Error controlling stream', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        } as LogContext);
        res.status(500).json({ 
          error: 'Failed to control stream',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Serve static assets with proper path resolution
    const assetsPath = path.join(process.cwd(), 'assets');
    logger.info('Starting demo server', {
      assetsPath
    } as LogContext);
    demoRouter.use('/assets', express.static(assetsPath));

    // Initialize layer renderer with 720p resolution
    layerRenderer.initialize({
      width: 1280,
      height: 720,
      targetFPS: 30
    });

    // Create test layers only if no layers exist
    try {
      const existingLayers = layerManager.getAllLayers();
      if (existingLayers.length === 0) {
        logger.info('No existing layers found, creating test layers');
        await createTestLayers();
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
    demoRouter.get('/demo', (req: Request, res: Response) => {
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
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
              }
              .status-indicators {
                display: flex;
                gap: 20px;
                align-items: center;
              }
              .status-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 4px;
                background: #333;
              }
              .status-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
              }
              .status-dot.live {
                background: #ff0000;
                animation: pulse 2s infinite;
              }
              .status-dot.offline {
                background: #666;
              }
              @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
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
              .layer-controls {
                margin-top: 20px;
                padding: 20px;
                background: #333;
                border-radius: 4px;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
              }
              .layer-control {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px;
                background: #444;
                border-radius: 4px;
              }
              .layer-control input[type="radio"] {
                width: 16px;
                height: 16px;
                margin: 0;
                cursor: pointer;
              }
              .layer-control label {
                font-size: 14px;
                cursor: pointer;
                user-select: none;
              }
              .layer-control-group {
                display: flex;
                gap: 12px;
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
              .status-card {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                display: none;
              }
              .status-card.visible {
                display: block;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Stream Manager Demo</h1>
                <div class="status-indicators">
                  <div class="status-indicator">
                    <div id="streamStatus" class="status-dot offline"></div>
                    <span id="streamStatusText">Offline</span>
                  </div>
                  <div class="status-indicator">
                    <span id="fpsCounter">0 FPS</span>
                  </div>
                </div>
              </div>
              
              <div class="canvas-container">
                <canvas id="output"></canvas>
                <div id="statusCard" class="status-card">
                  <h2>Stream Status</h2>
                  <p id="statusMessage">Initializing...</p>
                </div>
              </div>

              <div class="layer-controls">
                <div class="layer-control">
                  <div class="layer-control-group">
                    <div>
                      <input type="radio" id="host-visible" name="host" value="visible" checked>
                      <label for="host-visible">Show</label>
                    </div>
                    <div>
                      <input type="radio" id="host-hidden" name="host" value="hidden">
                      <label for="host-hidden">Hide</label>
                    </div>
                  </div>
                  <label>Host Layer</label>
                </div>

                <div class="layer-control">
                  <div class="layer-control-group">
                    <div>
                      <input type="radio" id="nft-visible" name="nft" value="visible" checked>
                      <label for="nft-visible">Show</label>
                    </div>
                    <div>
                      <input type="radio" id="nft-hidden" name="nft" value="hidden">
                      <label for="nft-hidden">Hide</label>
                    </div>
                  </div>
                  <label>NFT Layer</label>
                </div>

                <div class="layer-control">
                  <div class="layer-control-group">
                    <div>
                      <input type="radio" id="overlay-visible" name="overlay" value="visible" checked>
                      <label for="overlay-visible">Show</label>
                    </div>
                    <div>
                      <input type="radio" id="overlay-hidden" name="overlay" value="hidden">
                      <label for="overlay-hidden">Hide</label>
                    </div>
                  </div>
                  <label>Overlay Layer</label>
                </div>

                <div class="layer-control">
                  <div class="layer-control-group">
                    <div>
                      <input type="radio" id="chat-visible" name="chat" value="visible" checked>
                      <label for="chat-visible">Show</label>
                    </div>
                    <div>
                      <input type="radio" id="chat-hidden" name="chat" value="hidden">
                      <label for="chat-hidden">Hide</label>
                    </div>
                  </div>
                  <label>Chat Layer</label>
                </div>
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
              const fpsCounter = document.getElementById('fpsCounter');
              const streamStatus = document.getElementById('streamStatus');
              const streamStatusText = document.getElementById('streamStatusText');
              const statusCard = document.getElementById('statusCard');
              const statusMessage = document.getElementById('statusMessage');
              
              // Set canvas size
              canvas.width = 1920;
              canvas.height = 1080;

              // Layer visibility state
              const layerStates = {
                host: true,
                nft: true,
                overlay: true,
                chat: true
              };

              // Set up layer radio controls
              Object.keys(layerStates).forEach(layer => {
                document.getElementsByName(layer).forEach(radio => {
                  radio.addEventListener('change', (e) => {
                    const isVisible = e.target.value === 'visible';
                    toggleLayer(layer, isVisible);
                  });
                });
              });

              // Function to toggle layer visibility
              async function toggleLayer(type, isVisible) {
                console.log('Toggling layer:', type, 'Current state:', layerStates[type]);
                console.log('Sending request to /demo/toggle/', type, 'with body:', { visible: isVisible });
                
                try {
                  const response = await fetch(\`/demo/toggle/\${type}\`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ visible: isVisible })
                  });
                  
                  console.log('Response status:', response.status);
                  
                  if (!response.ok) {
                    const error = await response.json();
                    console.error('Error response:', error);
                    throw new Error(error.error || 'Failed to toggle layer');
                  }

                  const result = await response.json();
                  console.log('Success response:', result);
                  
                  if (result.success && result.layer) {
                    // Update our state to match the actual server state
                    const actualVisible = result.layer.visible;
                    const previousState = layerStates[type];
                    layerStates[type] = actualVisible;
                    
                    console.log('Layer state updated:', {
                      type,
                      previousState,
                      newState: actualVisible,
                      actualServerState: result.layer.actualState
                    });
                    
                    // Update radio button state to match actual server state
                    const newState = actualVisible ? 'visible' : 'hidden';
                    document.querySelector(\`input[name="\${type}"][value="\${newState}"]\`).checked = true;
                  }
                } catch (error) {
                  console.error('Error toggling layer:', error);
                  // Revert the radio button to match the previous state
                  const currentState = layerStates[type] ? 'visible' : 'hidden';
                  document.querySelector(\`input[name="\${type}"][value="\${currentState}"]\`).checked = true;
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

              // Function to update stream status
              async function updateStreamStatus() {
                try {
                  const response = await fetch('/demo/status');
                  const status = await response.json();
                  
                  const isLive = status.isLive;
                  streamStatus.className = \`status-dot \${isLive ? 'live' : 'offline'}\`;
                  streamStatusText.textContent = isLive ? 'Live' : 'Offline';
                  
                  if (status.fps) {
                    fpsCounter.textContent = \`\${Math.round(status.fps)} FPS\`;
                  }

                  // Update status card
                  if (!isLive) {
                    statusCard.classList.add('visible');
                    statusMessage.textContent = 'Stream is currently offline. Please wait...';
                  } else {
                    statusCard.classList.remove('visible');
                  }
                } catch (error) {
                  console.error('Error updating status:', error);
                  statusCard.classList.add('visible');
                  statusMessage.textContent = 'Error connecting to stream. Retrying...';
                }
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

              // Update canvas and status regularly
              setInterval(updateCanvas, 1000 / 30);
              setInterval(updateStreamStatus, 1000);
            </script>
          </body>
        </html>
      `);
    });

    // Add status endpoint
    demoRouter.get('/status', (req: Request, res: Response) => {
      const health = layerRenderer.getHealth();
      res.json({
        isLive: health.status === 'healthy',
        fps: health.fps,
        targetFPS: health.targetFPS,
        averageRenderTime: health.averageRenderTime,
        memoryUsage: health.memoryUsage,
        layerCount: health.layerCount
      });
    });

    // Endpoint to get the current frame
    demoRouter.get('/frame', (req: Request, res: Response) => {
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

    // Add layer toggle endpoint
    demoRouter.post('/toggle/:type', async (req: Request, res: Response) => {
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
    demoRouter.post('/chat', async (req: Request, res: Response) => {
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

    // Error handler for demo routes
    demoRouter.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Express error handler', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
      } as LogContext);
      res.status(500).json({ error: 'Internal server error' });
    });
  } catch (error) {
    logger.error('Demo server setup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    } as LogContext);
    process.exit(1);
  }
}