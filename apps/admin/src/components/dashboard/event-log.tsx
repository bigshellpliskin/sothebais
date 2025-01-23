"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Terminal } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Event {
  id: string;
  type: string;
  timestamp: string;
  data: any;
}

interface LogEntry {
  id: string;
  timestamp: string;
  content: string;
  source: string;
}

export function EventLog() {
  const [events, setEvents] = useState<Event[]>([]);
  const [containerLogs, setContainerLogs] = useState<{[key: string]: LogEntry[]}>({
    'event-handler': [],
    'traefik': [],
    'redis': [],
    'admin-frontend': [],
    'sothebais-admin-frontend-1': [],
    'sothebais-event-handler-1': [],
    'sothebais-redis-1': []
  });
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
        setEvents((prevEvents) => [newEvent, ...prevEvents].slice(0, 100));
        setError(null);
        retryCount = 0;
      };

      eventSource.onopen = () => {
        setError(null);
        retryCount = 0;
      };

      eventSource.onerror = (error) => {
        console.error('EventSource failed:', error);
        eventSource.close();
        
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
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

  // Load container logs
  useEffect(() => {
    const loadContainerLogs = async () => {
      try {
        const response = await fetch(`${getEventHandlerUrl()}/logs`);
        if (!response.ok) throw new Error('Failed to load container logs');
        const logs = await response.json();
        setContainerLogs(logs);
      } catch (err) {
        console.error('Failed to load container logs:', err);
      }
    };

    loadContainerLogs();
    const interval = setInterval(loadContainerLogs, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const renderLogContent = (entries: LogEntry[] | Event[] | undefined) => {
    if (!entries || entries.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No logs available...
        </div>
      );
    }

    return entries.map((entry: any) => {
      const timestamp = new Date(entry.timestamp).toISOString();
      const content = entry.content || JSON.stringify(entry.data, null, 2);
      
      return (
        <div
          key={entry.id}
          className="font-mono text-xs leading-relaxed border-b border-border/50 last:border-0"
        >
          <span className="text-muted-foreground">[{timestamp}]</span>{' '}
          <span className="text-green-500">$</span>{' '}
          <span className="text-foreground whitespace-pre-wrap">{content}</span>
        </div>
      );
    });
  };

  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <CardTitle>System Logs</CardTitle>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground">
            Using {getEventHandlerUrl()}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="event-handler">Event Handler</TabsTrigger>
            <TabsTrigger value="traefik">Traefik</TabsTrigger>
            <TabsTrigger value="redis">Redis</TabsTrigger>
            <TabsTrigger value="admin-frontend">Admin Frontend</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] bg-black/90 rounded-md mt-4 p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-500">
                {error}
              </div>
            ) : (
              <>
                <TabsContent value="events" className="mt-0">
                  {renderLogContent(events)}
                </TabsContent>
                <TabsContent value="event-handler" className="mt-0">
                  {renderLogContent(containerLogs['event-handler'])}
                </TabsContent>
                <TabsContent value="traefik" className="mt-0">
                  {renderLogContent(containerLogs['traefik'])}
                </TabsContent>
                <TabsContent value="redis" className="mt-0">
                  {renderLogContent(containerLogs['redis'])}
                </TabsContent>
                <TabsContent value="admin-frontend" className="mt-0">
                  {renderLogContent(containerLogs['admin-frontend'])}
                </TabsContent>
              </>
            )}
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
} 