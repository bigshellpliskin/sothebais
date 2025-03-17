"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StreamViewer } from "@/components/stream/stream-viewer";
import { PlaybackControls } from "@/components/stream/playback-controls";
import { StreamStatus } from "@/components/stream/stream-status";
import { ChatControls } from "@/components/stream/chat-controls";
import { useStreamState } from "@/hooks/useStreamState";
import { useState, useEffect, useRef } from "react";
import type { StreamState } from "@sothebais/packages/types/stream";

export default function LivestreamPage() {
  const { 
    streamState, 
    error, 
    isLoading,
    refetch: refetchState 
  } = useStreamState({
    pollInterval: 1000 // Poll every second
  });

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
              averageRenderTime={streamState.averageRenderTime}
            />
            <StreamViewer streamState={streamState} />
            <PlaybackControls
              isLive={streamState.isLive}
              isPaused={streamState.isPaused}
              onControlStream={controlStream}
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