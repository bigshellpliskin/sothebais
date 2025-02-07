'use client';

import { useEffect, useState } from 'react';

export function TestWebSocket() {
  const [status, setStatus] = useState('Disconnected');
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    // Use wss:// for https:// pages, ws:// for http:// pages
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    console.log('Connecting to:', url);

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setStatus('Connected');
      console.log('WebSocket connected successfully');
      ws.send(JSON.stringify({ type: 'hello', message: 'Hello from client!' }));
    };

    ws.onmessage = (event) => {
      console.log('Received message:', event.data);
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => [...prev, JSON.stringify(data)]);
      } catch {
        setMessages(prev => [...prev, event.data]);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('Error');
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setStatus('Disconnected');
    };

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up WebSocket connection');
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">WebSocket Test</h2>
      <div className="mb-4">
        Status: <span className={`font-bold ${status === 'Connected' ? 'text-green-600' : status === 'Error' ? 'text-red-600' : 'text-gray-600'}`}>
          {status}
        </span>
      </div>
      <div>
        <h3 className="font-bold mb-2">Messages:</h3>
        <ul className="list-disc pl-4 space-y-2">
          {messages.map((msg, i) => (
            <li key={i} className="break-all">{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
} 