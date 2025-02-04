"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from "lucide-react";
import { StreamViewer } from "@/components/stream-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";

interface StreamState {
  isLive: boolean;
  isPaused: boolean;
  fps: number;
  targetFPS: number;
  layerCount: number;
  averageRenderTime: number;
  layers: {
    host: boolean;
    nft: boolean;
    overlay: boolean;
    chat: boolean;
  };
}

export default function LivestreamPage() {
  const [chatMessage, setChatMessage] = useState("");
  const [streamState, setStreamState] = useState<StreamState>({
    isLive: false,
    isPaused: false,
    fps: 0,
    targetFPS: 30,
    layerCount: 0,
    averageRenderTime: 0,
    layers: {
      host: false,
      nft: false,
      overlay: false,
      chat: false
    }
  });

  // Queue system for layer updates
  const updateQueue = useRef<{ type: string; visible: boolean }[]>([]);
  const isProcessingQueue = useRef(false);

  // Process the queue of layer updates
  const processQueue = async () => {
    if (updateQueue.current.length === 0) {
      isProcessingQueue.current = false;
      return;
    }

    isProcessingQueue.current = true;
    
    // Take all current updates in queue
    const updates = [...updateQueue.current];
    updateQueue.current = [];

    try {
      const response = await fetch('/api/stream/control/layers/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[Frontend] Error processing queue:', error);
        throw new Error(error.message || 'Failed to process queue');
      }

      // Don't update local state here - let the status polling handle it
    } catch (error) {
      console.error('[Frontend] Error processing queue:', error);
      // Don't retry failed updates to avoid infinite loops
    } finally {
      // Process next batch if there are more updates
      if (updateQueue.current.length > 0) {
        await processQueue();
      } else {
        isProcessingQueue.current = false;
      }
    }
  };

  // Function to add updates to the queue
  const queueLayerUpdates = async (updates: { type: string; visible: boolean }[]) => {
    updateQueue.current.push(...updates);
    
    if (!isProcessingQueue.current) {
      await processQueue();
    }
  };

  // Function to toggle a single layer (now using queue)
  const toggleLayer = async (type: keyof StreamState['layers']) => {
    await queueLayerUpdates([{ 
      type, 
      visible: !streamState.layers[type] 
    }]);
  };

  // Function to control stream
  const controlStream = async (action: 'start' | 'stop' | 'pause') => {
    try {
      const response = await fetch('/api/stream/control/playback', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('[Frontend] Error controlling stream:', error);
        throw new Error(error.message || 'Failed to control stream');
      }

      // Don't update local state here - let the status polling handle it
    } catch (error) {
      console.error('[Frontend] Error controlling stream:', error);
    }
  };

  // Unified status polling
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/stream/status', {
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
        
        const { success, data } = await response.json();
        
        if (success && data) {
          setStreamState(prevState => ({
            isLive: data.isLive,
            isPaused: data.isPaused || false,
            fps: data.fps || 0,
            targetFPS: data.targetFPS || prevState.targetFPS,
            averageRenderTime: data.averageRenderTime || 0,
            layerCount: data.layerCount || 0,
            layers: {
              ...prevState.layers,
              ...(data.layers || {})
            }
          }));
        }
      } catch (error) {
        console.error('[Frontend] Error fetching status:', error);
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up polling interval
    const interval = setInterval(fetchStatus, 1000);

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  const sendChatMessage = async (highlighted: boolean = false) => {
    if (!chatMessage.trim()) return;

    try {
      const response = await fetch('/api/stream/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user: 'Admin',  // You might want to make this configurable
          message: chatMessage,
          highlighted
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      // Clear the input only if the message was sent successfully
      setChatMessage('');
    } catch (error) {
      console.error('[Frontend] Error sending message:', error);
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
            {/* Stream Viewer */}
            <StreamViewer
              streamStatus={{
                isLive: streamState.isLive,
                isPaused: streamState.isPaused,
                fps: streamState.fps,
                targetFPS: streamState.targetFPS,
                layerCount: streamState.layerCount,
                averageRenderTime: streamState.averageRenderTime
              }}
            />
            {/* Status & Playback Controls */}
            <div className="flex gap-2">
              {/* Status */}
              <div className="flex flex-col items-baseline gap-2">
                <CardTitle className="text-lg">Status</CardTitle>
                <div className="grid grid-cols-4 gap-1.5 flex-1 max-w-[460px]">
                  <div className="flex items-center justify-center bg-black/5 rounded-lg px-1.5 py-1 min-w-0">
                    <div className="flex items-center gap-1 truncate">
                      <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${streamState.isLive ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-xs font-medium truncate">{streamState.isLive ? 'Live' : 'Offline'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center bg-black/5 rounded-lg px-1.5 py-1 min-w-0">
                    <span className="text-xs font-medium truncate">FPS: {streamState.fps.toFixed(1)}/{streamState.targetFPS}</span>
                  </div>
                  <div className="flex items-center justify-center bg-black/5 rounded-lg px-1.5 py-1 min-w-0">
                    <span className="text-xs font-medium truncate">Layers: {streamState.layerCount}</span>
                  </div>
                  <div className="flex items-center justify-center bg-black/5 rounded-lg px-1.5 py-1 min-w-0">
                    <span className="text-xs font-medium truncate">Latency: {streamState.averageRenderTime.toFixed(1)}ms</span>
                  </div>
                </div>
              </div>
              {/* Playback Controls */}
              <div className="flex flex-col items-baseline gap-2">
                <CardTitle className="text-lg">Playback</CardTitle>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant={streamState.isLive && !streamState.isPaused ? "outline" : "default"}
                    className={`border-green-200 text-green-700 ${streamState.isLive && !streamState.isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => controlStream('start')}
                    disabled={streamState.isLive && !streamState.isPaused}
                  >
                    Play
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={() => controlStream('pause')}
                    disabled={!streamState.isLive}
                  >
                    Pause
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => controlStream('stop')}
                    disabled={!streamState.isLive}
                  >
                    Stop
                  </Button>
                </div>
              </div>
            </div>
            {/* Layer Controls */}
            <div className="flex flex-col gap-2">
              <CardTitle className="text-lg">Layer Controls</CardTitle>
              <div className="flex gap-4">
                {Object.entries(streamState.layers).map(([type, visible]) => (
                  <Button
                    key={type}
                    variant={visible ? "default" : "outline"}
                    onClick={() => toggleLayer(type as keyof StreamState['layers'])}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            {/* Chat */}
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
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
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