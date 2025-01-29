import { Server as WebSocketServer, WebSocket } from 'ws';
import { StreamEvent } from '../types/stream';
import { LayerState } from '../types/layers';
import { Config } from '../config';

interface WebSocketMessage {
  type: 'layerUpdate' | 'streamEvent' | 'error';
  payload: LayerState | StreamEvent | { message: string };
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor() {}

  initialize(config: Config) {
    this.wss = new WebSocketServer({ port: config.WS_PORT });
    this.wss.on('connection', this.handleConnection.bind(this));
    console.log(`WebSocket server started on port ${config.WS_PORT}`);
  }

  private handleConnection(ws: WebSocket): void {
    this.clients.add(ws);
    console.log('Client connected, total clients:', this.clients.size);

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        this.handleMessage(ws, data);
      } catch (error) {
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      console.log('Client disconnected, total clients:', this.clients.size);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  private handleMessage(ws: WebSocket, message: any): void {
    // Handle incoming messages based on type
    // To be implemented based on specific message types needed
    console.log('Received message:', message);
  }

  broadcastLayerState(state: LayerState): void {
    const message: WebSocketMessage = {
      type: 'layerUpdate',
      payload: state
    };
    this.broadcast(message);
  }

  broadcastStreamEvent(event: StreamEvent): void {
    const message: WebSocketMessage = {
      type: 'streamEvent',
      payload: event
    };
    this.broadcast(message);
  }

  private sendError(ws: WebSocket, message: string): void {
    const errorMessage: WebSocketMessage = {
      type: 'error',
      payload: { message }
    };
    ws.send(JSON.stringify(errorMessage));
  }

  private broadcast(message: WebSocketMessage): void {
    if (!this.wss) {
      throw new Error('WebSocket server not initialized. Call initialize() first.');
    }
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  shutdown(): void {
    if (this.wss) {
      this.wss.close(() => {
        console.log('WebSocket server shut down');
      });
      this.wss = null;
    }
  }
}

export const webSocketService = new WebSocketService(); 