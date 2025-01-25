"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { ServiceStatus } from "@/types/service";

const RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRIES = 3;

// List of actual core services that must be running
const CORE_SERVICES = ['event-handler', 'redis'];

export function HeaderStatus() {
  const { user } = useUser();
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isSystemConnected, setIsSystemConnected] = useState<boolean | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Check internet connection
  useEffect(() => {
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
    let timeoutId: NodeJS.Timeout;

    async function checkSystemConnection() {
      try {
        const response = await fetch('/api/services/status', {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.warn('Service status check failed:', response.status);
          setIsSystemConnected(false);
          
          // Retry on error if we haven't exceeded max retries
          if (retryCount < MAX_RETRIES) {
            setRetryCount(count => count + 1);
            timeoutId = setTimeout(checkSystemConnection, RETRY_DELAY);
          }
          return;
        }
        
        const statuses: Record<string, ServiceStatus> = await response.json();
        // Only check services that actually exist
        const allCoreServicesRunning = CORE_SERVICES.every(
          service => statuses[service] === 'running'
        );
        
        setIsSystemConnected(allCoreServicesRunning);
        setRetryCount(0); // Reset retry count on success
      } catch (error) {
        console.error('Error checking system status:', error);
        setIsSystemConnected(false);
        
        // Retry on error if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          setRetryCount(count => count + 1);
          timeoutId = setTimeout(checkSystemConnection, RETRY_DELAY);
        }
      }
    }

    checkSystemConnection();
    const interval = setInterval(checkSystemConnection, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [retryCount]);

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