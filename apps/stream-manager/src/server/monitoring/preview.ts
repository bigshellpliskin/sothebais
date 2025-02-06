import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { Renderer } from '../../rendering/renderer.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

interface PreviewClient {
  id: string;
  ws: WebSocket;
  quality: 'high' | 'medium' | 'low';
  lastPing: number;
}

export class PreviewServer extends EventEmitter {
  private static instance: PreviewServer | null = null;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, PreviewClient> = new Map();
  private renderer: Renderer;
  private isStreaming: boolean = false;
  private lastFrameBuffer: Buffer | null = null;
  private isInitialized: boolean = false;

  private constructor() {
    super();
    this.renderer = Renderer.getInstance();
  }

  public static getInstance(): PreviewServer {
    if (!PreviewServer.instance) {
      PreviewServer.instance = new PreviewServer();
    }
    return PreviewServer.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Wait for config to be available
    if (!config.WS_PORT) {
      logger.warn('WS_PORT not available in config, waiting for config to load...');
      return;
    }

    try {
      this.wss = new WebSocketServer({ port: config.WS_PORT });
      
      this.wss.on('connection', (ws: WebSocket) => {
        const clientId = `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const client: PreviewClient = {
          id: clientId,
          ws,
          quality: 'medium',
          lastPing: Date.now()
        };

        this.clients.set(clientId, client);

        logger.info('Preview client connected', { clientId });

        // Send last frame if available
        if (this.lastFrameBuffer) {
          this.sendFrameToClient(client, this.lastFrameBuffer);
        }

        // Handle client messages
        ws.on('message', (message: string) => {
          try {
            const data = JSON.parse(message);
            this.handleClientMessage(clientId, data);
          } catch (error) {
            logger.error('Error handling preview client message', { clientId, error });
          }
        });

        // Handle client disconnect
        ws.on('close', () => {
          this.clients.delete(clientId);
          logger.info('Preview client disconnected', { clientId });
        });

        // Send initial configuration
        ws.send(JSON.stringify({
          type: 'config',
          data: {
            width: 1920,
            height: 1080,
            fps: 30,
            quality: client.quality
          }
        }));
      });

      // Listen for new frames from renderer
      this.renderer.on('frame:ready', (frame: Buffer) => {
        this.lastFrameBuffer = frame;
        this.broadcastFrame(frame);
      });

      // Start ping interval
      setInterval(() => this.pingClients(), 30000);

      this.isInitialized = true;
      logger.info('Preview server initialized', { 
        port: config.WS_PORT,
        rendererStatus: this.renderer.getStats()
      });
    } catch (error) {
      logger.error('Failed to initialize preview server', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'quality':
        if (['high', 'medium', 'low'].includes(message.quality)) {
          client.quality = message.quality;
          logger.info('Client quality updated', { clientId, quality: client.quality });
        }
        break;

      case 'pong':
        client.lastPing = Date.now();
        break;

      default:
        logger.warn('Unknown message type from preview client', { 
          clientId, 
          messageType: message.type 
        });
    }
  }

  private sendFrameToClient(client: PreviewClient, frame: Buffer): void {
    if (!client.ws || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      const frameData = frame.toString('base64');
      client.ws.send(JSON.stringify({
        type: 'frame',
        data: frameData,
        timestamp: Date.now(),
        quality: client.quality
      }));
    } catch (error) {
      logger.error('Error sending frame to client', { 
        clientId: client.id, 
        error 
      });
    }
  }

  private async broadcastFrame(frame: Buffer): Promise<void> {
    if (this.clients.size === 0) return;

    for (const client of this.clients.values()) {
      this.sendFrameToClient(client, frame);
    }
  }

  private pingClients(): void {
    const now = Date.now();
    for (const [clientId, client] of this.clients) {
      // Check if client is responsive
      if (now - client.lastPing > 60000) { // 60 seconds timeout
        logger.warn('Preview client timeout', { clientId });
        client.ws.close();
        this.clients.delete(clientId);
        continue;
      }

      // Send ping
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }
  }

  public getCurrentFrame(): Buffer | null {
    return this.lastFrameBuffer;
  }

  public getStatus() {
    const rendererStats = this.renderer.getStats();
    return {
      isLive: this.isStreaming,
      fps: rendererStats.fps,
      targetFPS: config.TARGET_FPS,
      frameCount: rendererStats.frameCount,
      droppedFrames: rendererStats.droppedFrames,
      averageRenderTime: rendererStats.frameTime,
      connectedClients: this.clients.size
    };
  }

  public start(): void {
    if (this.isStreaming) return;
    this.isStreaming = true;
    this.renderer.start();
    logger.info('Preview streaming started');
  }

  public stop(): void {
    if (!this.isStreaming) return;
    this.isStreaming = false;
    this.renderer.stop();
    logger.info('Preview streaming stopped');
  }

  public shutdown(): void {
    this.stop();
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();
    if (this.wss) {
      this.wss.close();
    }
    PreviewServer.instance = null;
    logger.info('Preview server shut down');
  }
}
