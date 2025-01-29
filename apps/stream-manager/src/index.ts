import express from 'express';
import { createClient } from 'redis';
import { Server as WebSocketServer } from 'ws';
import { createCanvas } from '@napi-rs/canvas';

const app = express();
const port = process.env.PORT || 4200;
const wsPort = process.env.WS_PORT || 4201;

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start HTTP server
app.listen(port, () => {
  console.log(`Stream Manager HTTP server listening on port ${port}`);
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