import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { CompositionEngine } from '../../core/composition.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { stateManager } from '../../state/state-manager.js';
import type { Scene } from '../../types/core.js';
import type { StreamState, PreviewClient } from '../../types/state.js';
import { EventType, type StreamEvent } from '../../types/events.js';
import { Router } from 'express';

interface PreviewMessage {
  type: 'config' | 'frame' | 'quality' | 'ping' | 'pong';
  data?: any;
}

export class PreviewServer extends EventEmitter {
  private static instance: PreviewServer | null = null;
  private wss: WebSocketServer | null = null;
  private composition: CompositionEngine;
  private lastFrameBuffer: Buffer | null = null;
  private isInitialized: boolean = false;
  private frameInterval: NodeJS.Timeout | null = null;
  private currentScene: Scene | null = null;

  private constructor() {
    super();
    this.composition = CompositionEngine.getInstance();

    // Listen for state updates using EventEmitter
    stateManager.on(EventType.STATE_STREAM_UPDATE, (event: StreamEvent) => {
      const streamState = event.payload.state;
      if (streamState) {
        this.handleStreamStateUpdate(streamState);
        
        // Update current scene if provided in state update
        if ('currentScene' in streamState && streamState.currentScene) {
          this.currentScene = streamState.currentScene;
        }
      }
    });
  }

  public static getInstance(): PreviewServer {
    if (!PreviewServer.instance) {
      PreviewServer.instance = new PreviewServer();
    }
    return PreviewServer.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create WebSocket server with noServer option
      this.wss = new WebSocketServer({ 
        noServer: true,
        path: '/stream/preview'  // Base path for preview updates
      });
      
      this.wss.on('connection', this.handleNewConnection.bind(this));

      // Start ping interval
      setInterval(this.pingClients.bind(this), 30000);

      this.isInitialized = true;
      logger.info('Preview server initialized', { 
        path: '/stream/preview'
      });
    } catch (error) {
      logger.error('Failed to initialize preview server', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  // Handle upgrade requests from HTTP server
  handleUpgrade(request: any, socket: any, head: any) {
    if (!this.wss) return;

    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss?.emit('connection', ws);
    });
  }

  private handleNewConnection(ws: WebSocket): void {
    const clientId = `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize client state
    stateManager.updatePreviewClient(clientId, {
      id: clientId,
      quality: 'medium',
      lastPing: Date.now(),
      connected: true
    });

    logger.info('Preview client connected', { clientId });

    // Send last frame if available
    if (this.lastFrameBuffer) {
      this.sendFrameToClient(clientId, ws, this.lastFrameBuffer);
    }

    // Handle client messages
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message) as PreviewMessage;
        this.handleClientMessage(clientId, ws, data);
      } catch (error) {
        logger.error('Error handling preview client message', { clientId, error });
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      stateManager.updatePreviewClient(clientId, { connected: false });
      logger.info('Preview client disconnected', { clientId });
    });

    // Send initial configuration
    const streamState = stateManager.getStreamState();
    ws.send(JSON.stringify({
      type: 'config',
      data: {
        width: 1920,
        height: 1080,
        fps: streamState.targetFPS,
        quality: 'medium'
      }
    }));
  }

  private handleClientMessage(clientId: string, ws: WebSocket, message: PreviewMessage): void {
    switch (message.type) {
      case 'quality':
        if (['high', 'medium', 'low'].includes(message.data?.quality)) {
          stateManager.updatePreviewClient(clientId, {
            quality: message.data.quality
          });
          logger.info('Client quality updated', { clientId, quality: message.data.quality });
        }
        break;

      case 'pong':
        stateManager.updatePreviewClient(clientId, {
          lastPing: Date.now()
        });
        break;

      default:
        logger.warn('Unknown message type from preview client', { 
          clientId, 
          messageType: message.type 
        });
    }
  }

  private sendFrameToClient(clientId: string, ws: WebSocket, frame: Buffer): void {
    if (ws.readyState !== WebSocket.OPEN) return;

    try {
      const client = stateManager.getPreviewClients()[clientId];
      if (!client?.connected) return;

      const frameData = frame.toString('base64');
      ws.send(JSON.stringify({
        type: 'frame',
        data: frameData,
        timestamp: Date.now(),
        quality: client.quality
      }));
    } catch (error) {
      logger.error('Error sending frame to client', { 
        clientId, 
        error 
      });
    }
  }

  private broadcastFrame(frame: Buffer): void {
    if (!this.wss) return;

    this.wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        const clientId = this.findClientId(ws);
        if (clientId) {
          this.sendFrameToClient(clientId, ws, frame);
        }
      }
    });
  }

  private findClientId(ws: WebSocket): string | null {
    const clients = stateManager.getPreviewClients();
    for (const [clientId, client] of Object.entries(clients)) {
      if (client.connected && this.isClientWebSocket(clientId, ws)) {
        return clientId;
      }
    }
    return null;
  }

  private isClientWebSocket(clientId: string, ws: WebSocket): boolean {
    return this.wss?.clients.has(ws) || false;
  }

  private pingClients(): void {
    if (!this.wss) return;

    const now = Date.now();
    const clients = stateManager.getPreviewClients();

    this.wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        const clientId = this.findClientId(ws);
        if (clientId && clients[clientId]) {
          const lastPing = clients[clientId].lastPing;
          
          // Check if client is responsive
          if (now - lastPing > 60000) { // 60 seconds timeout
            logger.warn('Preview client timeout', { clientId });
            ws.close();
            stateManager.updatePreviewClient(clientId, { connected: false });
          } else {
            // Send ping
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }
      }
    });
  }

  private handleStreamStateUpdate(streamState: Partial<StreamState>): void {
    if (!this.wss) return;

    // Broadcast stream state changes to all clients
    const message = JSON.stringify({
      type: 'streamState',
      data: {
        isLive: streamState.isLive,
        fps: streamState.fps,
        targetFPS: streamState.targetFPS
      }
    });

    this.wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  public start(): void {
    if (this.frameInterval) return;

    stateManager.updateStreamState({ isLive: true, startTime: Date.now() });
    
    // Start frame generation at target FPS
    const targetFPS = config.TARGET_FPS || 30;
    const frameInterval = 1000 / targetFPS;
    
    this.frameInterval = setInterval(async () => {
      try {
        if (!this.currentScene) return;

        const frame = await this.composition.renderScene(this.currentScene);
        if (frame) {
          this.lastFrameBuffer = frame;
          this.broadcastFrame(frame);
        }
      } catch (error) {
        logger.error('Error generating preview frame', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, frameInterval);

    logger.info('Preview streaming started');
  }

  public stop(): void {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
    stateManager.updateStreamState({ isLive: false, startTime: undefined });
    logger.info('Preview streaming stopped');
  }

  public shutdown(): void {
    this.stop();
    if (this.wss) {
      this.wss.close();
    }
    PreviewServer.instance = null;
    logger.info('Preview server shut down');
  }
}
