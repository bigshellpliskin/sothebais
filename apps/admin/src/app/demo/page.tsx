"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from "lucide-react";
import { StreamViewer } from "@/components/stream-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

export default function DemoPage() {
  const [chatMessage, setChatMessage] = useState("");
  const [layerStates, setLayerStates] = useState({
    host: true,
    nft: true,
    overlay: true,
    chat: true
  });
  const [streamStatus, setStreamStatus] = useState({
    isLive: false,
    fps: 0,
    layerCount: 0,
    averageRenderTime: 0
  });

  // Function to fetch stream status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/stream/status');
        if (!response.ok) throw new Error('Failed to fetch status');
        const data = await response.json();
        setStreamStatus(data);
      } catch (error) {
        console.error('Error fetching stream status:', error);
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up polling interval
    const interval = setInterval(fetchStatus, 1000);

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  const toggleLayer = async (type: string) => {
    //console.log('Toggling layer:', type, 'Current state:', layerStates[type]);
    try {
      const newState = !layerStates[type];
      const requestBody = { visible: newState };
      //console.log('Sending request to /api/stream/toggle/', type, 'with body:', requestBody);
      
      const response = await fetch(`/api/stream/toggle/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      //console.log('Response status:', response.status);
      if (!response.ok) {
        const error = await response.json();
        console.log('Error response:', error);
        throw new Error(error.error || 'Failed to toggle layer');
      }
      
      const data = await response.json();
      //console.log('Success response:', data);

      setLayerStates(prev => ({
        ...prev,
        [type]: newState
      }));
    } catch (error) {
      console.error('Error toggling layer:', error);
    }
  };

  const sendChatMessage = async (highlighted: boolean = false) => {
    const input = document.getElementById('chatMessage') as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;

    try {
      const response = await fetch('/api/stream/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, highlighted })
      });
      if (!response.ok) throw new Error('Failed to send message');
      input.value = '';
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" aria-hidden="true" />
            <CardTitle>Stream Manager Demo</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            {/* Stream Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                streamStatus.isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {streamStatus.isLive ? 'Live' : 'Offline'}
              </span>
            </div>
            {/* FPS Counter */}
            <div className="text-sm text-gray-600">
              {Math.round(streamStatus.fps)} FPS
            </div>
            {/* Layer Count */}
            <div className="text-sm text-gray-600">
              {streamStatus.layerCount} Layers
            </div>
            {/* Render Time */}
            <div className="text-sm text-gray-600">
              {Math.round(streamStatus.averageRenderTime)}ms
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StreamViewer />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Layer Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(layerStates).map(([type, visible]) => (
              <Button 
                key={type}
                onClick={() => toggleLayer(type)}
                variant={visible ? "default" : "secondary"}
              >
                {visible ? 'Hide' : 'Show'} {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chat Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage(false);
                }
              }}
            />
            <Button onClick={() => sendChatMessage(false)}>Send Message</Button>
            <Button onClick={() => sendChatMessage(true)} variant="secondary">
              Send Bid
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 