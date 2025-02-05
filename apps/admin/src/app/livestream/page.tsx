"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StreamViewer } from "@/components/stream/stream-viewer";
import { PlaybackControls } from "@/components/stream/playback-controls";
import { StreamStatus } from "@/components/stream/stream-status";
import { LayerControls } from "@/components/stream/layer-controls";
import { ChatControls } from "@/components/stream/chat-controls";
import { useState, useEffect, useRef } from "react";

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  content: {
    type: string;
    data: unknown;
  };
}

interface StreamState {
  isLive: boolean;
  isPaused: boolean;
  fps: number;
  targetFPS: number;
  layerCount: number;
  averageRenderTime: number;
  layers: Layer[];
}

export default function LivestreamPage() {
  const [streamState, setStreamState] = useState<StreamState>({
    isLive: false,
    isPaused: false,
    fps: 0,
    targetFPS: 30,
    layerCount: 0,
    averageRenderTime: 0,
    layers: []
  });

  // Queue system for layer updates
  const updateQueue = useRef<{ id: string; visible: boolean }[]>([]);
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
    // Clear the queue
    updateQueue.current = [];

    try {
      // Process each update sequentially
      await Promise.all(updates.map(async ({ id, visible }) => {
        const response = await fetch(`/api/stream/layers/${id}/visibility`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ visible })
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[Frontend] Error updating layer visibility:', error);
          throw new Error(error.message || 'Failed to update layer visibility');
        }
      }));

      // Fetch updated layers
      await fetchLayers();
    } catch (error) {
      console.error('[Frontend] Error processing queue:', error);
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
  const queueLayerUpdates = async (updates: { id: string; visible: boolean }[]) => {
    updateQueue.current.push(...updates);
    
    if (!isProcessingQueue.current) {
      await processQueue();
    }
  };

  // Function to toggle a single layer
  const toggleLayer = async (layer: Layer) => {
    await queueLayerUpdates([{ 
      id: layer.id, 
      visible: !layer.visible 
    }]);
  };

  // Function to control stream
  const controlStream = async (action: 'start' | 'stop' | 'pause') => {
    try {
      const response = await fetch('/api/stream/playback', {
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

  // Function to send chat message
  const sendChatMessage = async (message: string, highlighted: boolean) => {
    try {
      const response = await fetch('/api/stream/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          text: message,
          highlighted
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send chat message');
      }
    } catch (error) {
      console.error('[Frontend] Error sending chat message:', error);
    }
  };

  // Function to fetch layers
  const fetchLayers = async () => {
    try {
      const response = await fetch('/api/stream/layers', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
      
      // Try to parse response as JSON, handle parse errors explicitly
      let errorData;
      let data;
      
      try {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('[Frontend] Failed to parse response:', text);
          throw new Error('Invalid JSON response from server');
        }
      } catch (e) {
        console.error('[Frontend] Error reading response:', e);
        throw new Error('Failed to read server response');
      }

      if (!response.ok) {
        console.error('[Frontend] Layer fetch failed:', {
          status: response.status,
          error: data
        });
        throw new Error(`Failed to fetch layers: ${data.error || response.statusText}`);
      }

      if (!data.success && data.error) {
        throw new Error(data.error);
      }

      setStreamState(prev => ({
        ...prev,
        layers: data.data,
        layerCount: data.count || data.data.length
      }));
    } catch (error) {
      console.error('[Frontend] Error fetching layers:', error);
      // Set empty layers array on error to prevent UI from breaking
      setStreamState(prev => ({
        ...prev,
        layers: [],
        layerCount: 0
      }));
    }
  };

  // Function to fetch stream status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/stream/status');
      if (!response.ok) {
        throw new Error('Failed to fetch stream status');
      }
      const data = await response.json();
      
      setStreamState(prev => ({
        ...prev,
        isLive: Boolean(data.isLive),
        isPaused: Boolean(data.isPaused),
        fps: Number(data.fps) || 0,
        targetFPS: Number(data.targetFPS) || prev.targetFPS,
        averageRenderTime: Number(data.averageRenderTime) || 0
      }));
    } catch (error) {
      console.error('[Frontend] Error fetching status:', error);
      setStreamState(prev => ({
        ...prev,
        isLive: false
      }));
    }
  };

  // Fetch initial data and set up polling
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchLayers(),
        fetchStatus()
      ]);
    };

    fetchData();

    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Live Stream Control</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            
            <StreamStatus
              isLive={streamState.isLive}
              isPaused={streamState.isPaused}
              fps={streamState.fps}
              targetFPS={streamState.targetFPS}
              layerCount={streamState.layerCount}
              averageRenderTime={streamState.averageRenderTime}
            />
            <StreamViewer streamStatus={streamState} />
            <PlaybackControls
              isLive={streamState.isLive}
              isPaused={streamState.isPaused}
              onControlStream={controlStream}
            />
            <LayerControls
              layers={streamState.layers}
              onToggleLayer={toggleLayer}
            />
            <ChatControls
              onSendMessage={sendChatMessage}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 