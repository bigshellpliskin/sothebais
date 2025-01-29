import express from 'express';
import { createClient } from 'redis';
import { Server as WebSocketServer } from 'ws';
import { createCanvas } from '@napi-rs/canvas';

// Create Express apps for main API and health check
const app = express();
const healthApp = express();

// Get ports from environment variables with fallbacks
const port = process.env.PORT || 4200;
const wsPort = process.env.WS_PORT || 4201;
const healthPort = process.env.HEALTH_PORT || 4291;

// Basic health check endpoint on main API
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dedicated health check endpoint
healthApp.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start HTTP servers
app.listen(port, () => {
  console.log(`Stream Manager HTTP server listening on port ${port}`);
});

healthApp.listen(healthPort, () => {
  console.log(`Stream Manager Health Check server listening on port ${healthPort}`);
});

// Start WebSocket server
const wss = new WebSocketServer({ port: Number(wsPort) });
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    console.log('Received:', message);
  });
});

// Test canvas creation
const canvas = createCanvas(1920, 1080);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, 1920, 1080);

console.log('Stream Manager initialized'); 