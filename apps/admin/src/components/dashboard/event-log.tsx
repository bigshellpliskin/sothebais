"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

interface Event {
  id: string;
  type: string;
  timestamp: string;
  data: any;
}

export function EventLog() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the base URL for the event handler
  const getEventHandlerUrl = () => {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:4300';
    }
    return `https://${process.env.NEXT_PUBLIC_EVENT_HANDLER_SUBDOMAIN}`;
  };

  // Load historical events
  useEffect(() => {
    const loadHistoricalEvents = async () => {
      try {
        const response = await fetch(`${getEventHandlerUrl()}/events/recent`);
        if (!response.ok) throw new Error('Failed to load events');
        const historicalEvents = await response.json();
        setEvents(historicalEvents);
        setError(null);
      } catch (err) {
        console.error('Failed to load historical events:', err);
        setError('Failed to load historical events');
      } finally {
        setLoading(false);
      }
    };

    loadHistoricalEvents();
  }, []);

  // Set up real-time event stream
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    const connectEventSource = () => {
      const eventSource = new EventSource(`${getEventHandlerUrl()}/events`);

      eventSource.onmessage = (event) => {
        const newEvent = JSON.parse(event.data);
        setEvents((prevEvents) => [newEvent, ...prevEvents].slice(0, 100)); // Keep last 100 events
        setError(null);
        retryCount = 0; // Reset retry count on successful connection
      };

      eventSource.onopen = () => {
        setError(null);
        retryCount = 0; // Reset retry count on successful connection
      };

      eventSource.onerror = (error) => {
        console.error('EventSource failed:', error);
        eventSource.close();
        
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff with max 30s
          setTimeout(connectEventSource, delay);
          setError(`Connection lost. Retrying in ${delay/1000}s...`);
        } else {
          setError('Failed to connect to event stream. Please refresh the page.');
        }
      };

      return eventSource;
    };

    const eventSource = connectEventSource();
    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Event Log</CardTitle>
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground">
            Using {getEventHandlerUrl()}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500">
              {error}
            </div>
          ) : events.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No events received yet...
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="mb-4 rounded-lg border p-4 text-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{event.type}</span>
                  <span className="text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                <pre className="mt-2 whitespace-pre-wrap text-xs">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 