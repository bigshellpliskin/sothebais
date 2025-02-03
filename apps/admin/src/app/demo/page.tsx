"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from "lucide-react";
import { StreamViewer } from "@/components/stream-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function DemoPage() {
  const [chatMessage, setChatMessage] = useState("");

  const toggleLayer = async (type: string) => {
    try {
      const response = await fetch(`/api/stream/toggle/${type}`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to toggle layer');
      }
    } catch (error) {
      console.error('Error toggling layer:', error);
    }
  };

  const sendChatMessage = async (highlighted: boolean = false) => {
    if (!chatMessage.trim()) return;

    try {
      const response = await fetch('/api/stream/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: chatMessage,
          highlighted
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setChatMessage('');
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
            <Button onClick={() => toggleLayer('host')}>Toggle Host</Button>
            <Button onClick={() => toggleLayer('nft')}>Toggle NFT</Button>
            <Button onClick={() => toggleLayer('shape')}>Toggle Shape</Button>
            <Button onClick={() => toggleLayer('text')}>Toggle Text</Button>
            <Button onClick={() => toggleLayer('chat')}>Toggle Chat</Button>
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