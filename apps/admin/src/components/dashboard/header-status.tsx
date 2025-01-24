"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { ServiceStatus } from "@/types/service";

export function HeaderStatus() {
  const { user } = useUser();
  // Initialize with null to avoid hydration mismatch
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isSystemConnected, setIsSystemConnected] = useState<boolean | null>(null);

  // Check internet connection
  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);
    
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

  // Check system services connection
  useEffect(() => {
    async function checkSystemConnection() {
      try {
        const response = await fetch('/api/services/status');
        if (!response.ok) {
          setIsSystemConnected(false);
          return;
        }
        
        const statuses: Record<string, ServiceStatus> = await response.json();
        // Check if core services are running
        const coreServices = ['event-handler', 'redis', 'traefik'];
        const allCoreServicesRunning = coreServices.every(
          service => statuses[service] === 'running'
        );
        
        setIsSystemConnected(allCoreServicesRunning);
      } catch {
        setIsSystemConnected(false);
      }
    }

    checkSystemConnection();
    const interval = setInterval(checkSystemConnection, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Don't render anything until we have client-side values
  if (isOnline === null || isSystemConnected === null) {
    return null;
  }

  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-4">
        <StatusIndicator
          status={isOnline ? "online" : "offline"}
          label="Internet"
        />
        <StatusIndicator
          status={isSystemConnected ? "online" : "offline"}
          label="System"
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