import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

interface ChatControlsProps {
  onSendMessage: (message: string, highlighted: boolean) => Promise<void>;
}

export function ChatControls({ onSendMessage }: ChatControlsProps) {
  const [chatMessage, setChatMessage] = useState("");

  const handleSend = async (highlighted: boolean) => {
    if (!chatMessage.trim()) return;
    await onSendMessage(chatMessage, highlighted);
    setChatMessage("");
  };

  return (
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
                  handleSend(false);
                }
              }}
            />
            <Button onClick={() => handleSend(false)}>Send</Button>
            <Button onClick={() => handleSend(true)}>Bid</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 