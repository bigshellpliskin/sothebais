'use client';

import { useEffect, useState } from 'react';

export default function TestWebSocket() {
  const [status, setStatus] = useState('Disconnected');
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;

    const connect = () => {
      try {
        // Get the protocol and host
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const url = `${protocol}//${host}/api/stream/ws`;

        console.log('Attempting WebSocket connection to:', url);

        ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('WebSocket connection established');
          setStatus('Connected');
          setError(null);
          
          // Send a test message
          ws?.send(JSON.stringify({ 
            type: 'test',
            payload: { message: 'Hello from client!' }
          }));
        };

        ws.onmessage = (event) => {
          console.log('Received message:', event.data);
          try {
            const data = JSON.parse(event.data);
            setMessages(prev => [...prev, JSON.stringify(data, null, 2)]);
          } catch (err) {
            console.error('Failed to parse message:', err);
            setMessages(prev => [...prev, event.data]);
          }
        };

        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          setStatus('Error');
          setError('WebSocket error occurred. Check console for details.');
        };

        ws.onclose = (event) => {
          console.log('WebSocket closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          setStatus('Disconnected');
          setError(`Connection closed: ${event.reason || 'No reason provided'} (code: ${event.code})`);

          // Attempt to reconnect after 5 seconds
          setTimeout(connect, 5000);
        };
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        setError(`Failed to create WebSocket: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    connect();

    return () => {
      if (ws) {
        console.log('Cleaning up WebSocket connection');
        ws.close();
      }
    };
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">WebSocket Test</h2>
      
      <div className="mb-4">
        <strong>Status:</strong> 
        <span className={`ml-2 ${
          status === 'Connected' ? 'text-green-600' : 
          status === 'Error' ? 'text-red-600' : 
          'text-yellow-600'
        }`}>
          {status}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mt-4">
        <h3 className="font-bold mb-2">Messages:</h3>
        <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages received yet...</p>
          ) : (
            messages.map((msg, i) => (
              <pre key={i} className="mb-2 p-2 bg-white rounded shadow">
                {msg}
              </pre>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 