"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StreamViewer } from "@/components/stream/stream-viewer";
import { PlaybackControls } from "@/components/stream/playback-controls";
import { StreamStatus } from "@/components/stream/stream-status";
import { LayerControls } from "@/components/stream/layer-controls";
import { ChatControls } from "@/components/stream/chat-controls";
import { useStreamState } from "@/hooks/useStreamState";
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
  const { 
    streamState, 
    layers, 
    error, 
    isLoading,
    refetch: refetchState 
  } = useStreamState({
    pollInterval: 1000 // Poll every second
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

      // Fetch updated state after layer changes
      await refetchState();
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

      // Immediately refetch state after control action
      await refetchState();
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

      // Refetch state after sending message
      await refetchState();
    } catch (error) {
      console.error('[Frontend] Error sending chat message:', error);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-red-500">Error: {error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              layerCount={layers.length}
              averageRenderTime={streamState.averageRenderTime}
            />
            <StreamViewer streamState={streamState} />
            <PlaybackControls
              isLive={streamState.isLive}
              isPaused={streamState.isPaused}
              onControlStream={controlStream}
            />
            <LayerControls
              layers={layers}
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