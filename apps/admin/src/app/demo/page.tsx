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
        // console.log('[Frontend] Making request to:', apiUrl);
        const response = await fetch(apiUrl, {
          // Add headers to ensure proper routing
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
        
        // Log the raw data from stream manager
        // console.log('[Frontend] Raw status data:', {
        //   fps: data.fps,
        //   targetFPS: data.targetFPS,
        //   timestamp: new Date().toISOString()
        // });
        
        // Verify the data before updating state
        if (typeof data.fps !== 'number') {
          console.warn('[Frontend] Invalid FPS value received:', data.fps);
          return;
        }
        
        setStreamStatus(prevStatus => ({
          ...prevStatus,
          ...data,
          fps: data.fps || 0 // Ensure we have a number, default to 0
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
  }, []); // Keep empty dependency array

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
        </CardHeader>
        <CardContent className="space-y-6">
          <StreamViewer streamStatus={streamStatus} />
          <div className="flex flex-col gap-4">
            {/* Playback Controls Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Playback Controls</h3>
              <div className="flex items-center justify-center gap-4">
                <Button 
                  onClick={() => controlStream('start')} 
                  variant="default"
                  disabled={streamStatus.isLive}
                >
                  Start Stream
                </Button>
                <Button 
                  onClick={() => controlStream('pause')} 
                  variant="secondary"
                  disabled={!streamStatus.isLive}
                >
                  Pause Stream
                </Button>
                <Button 
                  onClick={() => controlStream('stop')} 
                  variant="destructive"
                  disabled={!streamStatus.isLive}
                >
                  Stop Stream
                </Button>
              </div>
            </div>

            {/* Stream Status Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Stream Status</h3>
              <div className="flex items-center justify-center gap-6">
                {/* Live Status */}
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
                  {streamStatus.isLive ? `${Math.round(streamStatus.fps)}/${streamStatus.targetFPS} FPS` : '-'}
                </div>
                {/* Layer Count */}
                <div className="text-sm text-gray-600">
                  {Object.values(layerStates).filter(Boolean).length}/{Object.keys(layerStates).length} Layers
                </div>
                {/* Render Time */}
                <div className="text-sm text-gray-600">
                  {streamStatus.isLive ? `${Math.round(streamStatus.averageRenderTime)}ms` : '-'}
                </div>
              </div>
            </div>

            {/* Layer Controls Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Layer Controls</h3>
              <div className="flex flex-wrap gap-4">
                {Object.entries(layerStates).map(([type, visible]) => (
                  <Button 
                    key={type}
                    onClick={() => toggleLayer(type)}
                    variant={visible ? "default" : "secondary"}
                    size="sm"
                  >
                    {visible ? 'Hide' : 'Show'} {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
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