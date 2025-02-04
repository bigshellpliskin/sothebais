"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from "lucide-react";
import { StreamViewer } from "@/components/stream-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

export default function LivestreamPage() {
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
    targetFPS: 30,
    layerCount: 0,
    averageRenderTime: 0
  });

  // Function to control stream
  const controlStream = async (action: 'start' | 'stop' | 'pause') => {
    try {
      const response = await fetch('/api/stream/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error controlling stream:', error);
        return;
      }

      const data = await response.json();
      console.log('Stream control response:', data);

      // Update stream status immediately
      setStreamStatus(prevStatus => ({
        ...prevStatus,
        isLive: data.isLive,
        fps: data.fps || 0
      }));
    } catch (error) {
      console.error('Error controlling stream:', error);
    }
  };

  // Function to fetch stream status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const apiUrl = '/api/stream/status';
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.error('[Frontend] Bad response:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url
          });
          throw new Error('Failed to fetch status');
        }
        
        const data = await response.json();
        
        if (typeof data.fps !== 'number') {
          console.warn('[Frontend] Invalid FPS value received:', data.fps);
          return;
        }
        
        setStreamStatus(prevStatus => ({
          ...prevStatus,
          ...data,
          fps: data.fps || 0
        }));
      } catch (error) {
        console.error('[Frontend] Error fetching stream status:', error);
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
    try {
      const newState = !layerStates[type];
      const requestBody = { visible: newState };
      
      const response = await fetch(`/api/stream/toggle/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.log('Error response:', error);
        throw new Error(error.error || 'Failed to toggle layer');
      }
      
      const data = await response.json();

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
    <div className="flex flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-6 w-6" />
            Stream Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <StreamViewer
              streamStatus={streamStatus}
            />
            <div className="flex flex-col gap-2">
              <CardTitle className="text-lg">Stream Controls</CardTitle>
              <div className="flex gap-4">
                <Button
                  variant={streamStatus.isLive ? "default" : "outline"}
                  onClick={() => controlStream('start')}
                >
                  Play
                </Button>
                <Button
                  variant="outline"
                  onClick={() => controlStream('pause')}
                >
                  Pause
                </Button>
                <Button
                  variant="outline"
                  onClick={() => controlStream('stop')}
                >
                  Stop
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <CardTitle className="text-lg">Layer Controls</CardTitle>
              <div className="flex gap-4">
                {Object.entries(layerStates).map(([type, isVisible]) => (
                  <Button
                    key={type}
                    variant={isVisible ? "default" : "outline"}
                    onClick={() => toggleLayer(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <Input
                      id="chatMessage"
                      placeholder="Type a message..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          sendChatMessage(false);
                        }
                      }}
                    />
                    <Button onClick={() => sendChatMessage(false)}>Send</Button>
                    <Button onClick={() => sendChatMessage(true)}>Bid</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 