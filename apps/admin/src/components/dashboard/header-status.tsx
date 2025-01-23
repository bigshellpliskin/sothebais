"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { StatusIndicator } from "@/components/ui/status-indicator";

export function HeaderStatus() {
  const { user } = useUser();
  const [isOnline, setIsOnline] = useState(true);
  const [isDockerConnected, setIsDockerConnected] = useState(false);

  // Check internet connection
  useEffect(() => {
    function updateOnlineStatus() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Check Docker connection
  useEffect(() => {
    async function checkDockerConnection() {
      try {
        const response = await fetch('/api/services/status');
        setIsDockerConnected(response.ok);
      } catch {
        setIsDockerConnected(false);
      }
    }

    checkDockerConnection();
    const interval = setInterval(checkDockerConnection, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-4">
        <StatusIndicator
          status={isOnline ? "online" : "offline"}
          label="Internet"
        />
        <StatusIndicator
          status={isDockerConnected ? "online" : "offline"}
          label="Docker"
        />
      </div>
      {user && (
        <div className="text-sm text-gray-600">
          {user.fullName || user.username || user.primaryEmailAddress?.emailAddress}
        </div>
      )}
    </div>
  );
} 