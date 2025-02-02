"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Terminal } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  type: string;
  timestamp: string;
  data: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  content: string;
  source: string;
}

interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: string;
  component: string;
  service: string;
  state: string;
  message: string;
  context: string;
}

export function EventLog() {
  const [containerLogs, setContainerLogs] = useState<{[key: string]: LogEntry[]}>({});
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef<{[key: string]: string}>({});
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Buffer for collecting logs before updating state
  const logsBufferRef = useRef<{
    container: {[key: string]: LogEntry[]},
    system: SystemLogEntry[]
  }>({
    container: {},
    system: []
  });

  // Function to merge new logs with existing ones, avoiding duplicates
  const mergeContainerLogs = (existing: LogEntry[], newLogs: LogEntry[]): LogEntry[] => {
    const seen = new Set(existing.map(log => generateUniqueKey(log, 0)));
    return [
      ...existing,
      ...newLogs.filter(log => !seen.has(generateUniqueKey(log, 0)))
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const mergeSystemLogs = (existing: SystemLogEntry[], newLogs: SystemLogEntry[]): SystemLogEntry[] => {
    const seen = new Set(existing.map(log => generateUniqueKey(log, 0)));
    return [
      ...existing,
      ...newLogs.filter(log => !seen.has(generateUniqueKey(log, 0)))
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  // Function to flush the buffer and update state
  const flushBuffer = useCallback(() => {
    const { container: containerBuffer, system: systemBuffer } = logsBufferRef.current;

    setContainerLogs(prevLogs => {
      const newLogs = { ...prevLogs };
      Object.entries(containerBuffer).forEach(([key, logs]) => {
        newLogs[key] = mergeContainerLogs(prevLogs[key] || [], logs);
      });
      return newLogs;
    });

    setSystemLogs(prevLogs => mergeSystemLogs(prevLogs, systemBuffer));

    // Clear the buffer
    logsBufferRef.current = {
      container: {},
      system: []
    };
  }, []);

  // Function to scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  // Load container logs and system logs
  useEffect(() => {
    const loadLogs = async () => {
      try {
        if (!isClient) return;

        const baseUrl = getEventHandlerUrl();
        const headers = { 'Accept': 'application/json' };

        // Add last-update timestamp to requests if available
        const containerOptions = {
          headers: {
            ...headers,
            ...(lastUpdateRef.current.container && {
              'If-Modified-Since': lastUpdateRef.current.container
            })
          }
        };

        const systemOptions = {
          headers: {
            ...headers,
            ...(lastUpdateRef.current.system && {
              'If-Modified-Since': lastUpdateRef.current.system
            })
          }
        };

        const responses = await Promise.all([
          fetch(`${baseUrl}/logs`, containerOptions),
          fetch(`${baseUrl}/system-logs`, systemOptions)
        ]);

        const [containerResponse, systemResponse] = responses;

        // Only process responses if they have new data
        if (containerResponse.status === 200) {
          const containerLogsData = await containerResponse.json();
          lastUpdateRef.current.container = new Date().toISOString();

          // Process container logs
          Object.entries(containerLogsData).forEach(([key, logs]) => {
            const processedLogs = (logs as LogEntry[]).map(log => ({
              ...log,
              timestamp: new Date(log.timestamp).toISOString(),
            }));
            
            if (!logsBufferRef.current.container[key]) {
              logsBufferRef.current.container[key] = [];
            }
            logsBufferRef.current.container[key].push(...processedLogs);
          });
        }

        if (systemResponse.status === 200) {
          const systemLogsData = await systemResponse.json();
          lastUpdateRef.current.system = new Date().toISOString();

          // Process system logs
          const processedSystemLogs = systemLogsData.map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp).toISOString(),
            context: typeof log.context === 'object' ? JSON.stringify(log.context) : String(log.context || '')
          }));

          logsBufferRef.current.system.push(...processedSystemLogs);
        }

        // Schedule buffer flush
        if (bufferTimeoutRef.current) {
          clearTimeout(bufferTimeoutRef.current);
        }
        bufferTimeoutRef.current = setTimeout(flushBuffer, 1000);

        setError(null);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load logs:', err);
        setError(err instanceof Error ? err.message : 'Failed to load logs');
        setLoading(false);
      }
    };

    // Initial load
    loadLogs();

    // Set up polling interval
    const interval = setInterval(loadLogs, 5000);

    return () => {
      clearInterval(interval);
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    };
  }, [isClient, flushBuffer]);

  // Set isClient to true on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Scroll to bottom on initial load and whenever logs change
  useEffect(() => {
    if (!loading) {
      // Scroll immediately
      scrollToBottom();
      // And again after a short delay to ensure content is rendered
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [loading, containerLogs, systemLogs, scrollToBottom]);

  // Get the base URL for event handler
  const getEventHandlerUrl = () => {
    // In development, use direct connection to event-handler
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:4300';
    }
    // In production, use Traefik-routed URL
    return '/events';
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-destructive border-destructive';
      case 'warn': return 'text-warning border-warning';
      case 'info': return 'text-info border-info';
      case 'debug': return 'text-muted-foreground border-muted';
      default: return 'text-muted-foreground border-muted';
    }
  };

  const renderSystemLogs = (logs: SystemLogEntry[]) => {
    if (!logs || logs.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No logs available...
        </div>
      );
    }

    // Sort logs chronologically (newest last)
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sortedLogs.map((log) => {
      const date = new Date(log.timestamp);
      const timestamp = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      return (
        <div
          key={log.id}
          className="font-mono text-xs leading-relaxed border-b border-border/50 last:border-0 py-2"
        >
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">[{timestamp}]</span>
            <Badge variant="outline" className={getLevelColor(log.level)}>
              {log.level}
            </Badge>
            <Badge variant="outline" className="text-primary border-primary">{log.service}</Badge>
            <Badge variant="outline" className="text-secondary border-secondary">{log.component}</Badge>
            {log.state && <Badge variant="outline" className="text-accent border-accent">{log.state}</Badge>}
          </div>
          <div className="mt-1 text-foreground whitespace-pre-wrap">
            {log.message}
          </div>
          {log.context && (
            <div className="mt-1 text-muted-foreground">
              {log.context}
            </div>
          )}
        </div>
      );
    });
  };

  const generateUniqueKey = (entry: any, index: number): string => {
    // For system logs that have an id field
    if (entry.id) {
      return entry.id;
    }

    const timestamp = entry.timestamp || '';
    const content = entry.content || entry.data || '';
    const containerName = entry.source || '';
    
    // Create a more robust hash using all available data
    const str = `${containerName}-${timestamp}-${typeof content === 'string' ? content : JSON.stringify(content)}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Add index to ensure uniqueness even if hash collides
    return `${containerName}-${timestamp}-${hash}-${index}`;
  };

  const renderLogContent = (entries: LogEntry[] | Event[] | undefined) => {
    if (!entries || entries.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No logs available...
        </div>
      );
    }

    // Sort entries chronologically (newest last)
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sortedEntries.map((entry: any, index: number) => {
      const date = new Date(entry.timestamp);
      const timestamp = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      // Parse the content if it's JSON
      let parsedContent;
      let level = 'info';
      let component = '';
      let service = entry.source || '';
      let message = '';

      try {
        // First try parsing the data field if it exists
        if (entry.data && typeof entry.data === 'string') {
          parsedContent = JSON.parse(entry.data);
        } 
        // Then try the content field
        else if (entry.content && typeof entry.content === 'string') {
          parsedContent = JSON.parse(entry.content);
        }

        if (parsedContent) {
          // Extract all possible metadata fields
          level = parsedContent.level || parsedContent.severity || level;
          component = parsedContent.component || parsedContent.name || component;
          service = parsedContent.service || entry.source || service;
          message = parsedContent.message || parsedContent.msg || parsedContent.text || '';

          // Extract additional metadata
          const env = parsedContent.env;
          const container = parsedContent.container;
          const logCount = parsedContent.logCount;
          const time = parsedContent.time;

          // Debug log structure
          console.log('Parsed log entry:', {
            original: entry,
            parsed: parsedContent,
            extracted: { level, component, service, message, env, container, logCount, time }
          });

          return (
            <div
              key={generateUniqueKey(entry, index)}
              className="font-mono text-xs leading-relaxed border-b border-border/50 last:border-0 py-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground">[{timestamp}]</span>
                <Badge variant="outline" className={getLevelColor(level)}>
                  {level}
                </Badge>
                {service && (
                  <Badge variant="outline" className="text-primary border-primary">
                    {service.replace('sothebais-', '')}
                  </Badge>
                )}
                {component && (
                  <Badge variant="outline" className="text-secondary border-secondary">
                    {component}
                  </Badge>
                )}
                {env && (
                  <Badge variant="outline" className="text-accent border-accent">
                    {env}
                  </Badge>
                )}
                {container && (
                  <Badge variant="outline" className="text-info border-info">
                    {container.replace('sothebais-', '')}
                  </Badge>
                )}
                {logCount && (
                  <Badge variant="outline" className="text-muted border-muted">
                    logs: {logCount}
                  </Badge>
                )}
              </div>
              <div className="mt-1 text-foreground whitespace-pre-wrap">
                {message}
              </div>
            </div>
          );
        }
      } catch (err) {
        // If parsing fails, use the raw content
        message = entry.content || (typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2)) || '';
        console.log('Failed to parse log entry:', {
          error: err,
          entry: entry,
          rawMessage: message
        });
      }
      
      return (
        <div
          key={generateUniqueKey(entry, index)}
          className="font-mono text-xs leading-relaxed border-b border-border/50 last:border-0 py-2"
        >
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">[{timestamp}]</span>
            <Badge variant="outline" className={getLevelColor(level)}>
              {level}
            </Badge>
            {service && (
              <Badge variant="outline" className="text-primary border-primary">
                {service.replace('sothebais-', '')}
              </Badge>
            )}
            {component && (
              <Badge variant="outline" className="text-secondary border-secondary">
                {component}
              </Badge>
            )}
          </div>
          <div className="mt-1 text-foreground whitespace-pre-wrap">
            {message}
          </div>
        </div>
      );
    });
  };

  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" aria-hidden="true" />
          <CardTitle>System Logs</CardTitle>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground">
            Using {getEventHandlerUrl()}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isClient && (
          <Tabs key="event-log-tabs" defaultValue="system" className="w-full">
            <div className="border-b mb-4 overflow-x-auto">
              <TabsList className="w-full justify-start inline-flex whitespace-nowrap">
                <TabsTrigger value="system">System Logs</TabsTrigger>
                <TabsTrigger value="event-handler">Event Handler</TabsTrigger>
                <TabsTrigger value="auction-manager">Auction Manager</TabsTrigger>
                <TabsTrigger value="traefik">Traefik</TabsTrigger>
                <TabsTrigger value="redis">Redis</TabsTrigger>
                <TabsTrigger value="prometheus">Prometheus</TabsTrigger>
                <TabsTrigger value="grafana">Grafana</TabsTrigger>
                <TabsTrigger value="admin-frontend">Admin Frontend</TabsTrigger>
              </TabsList>
            </div>
            <div ref={scrollRef}>
              <ScrollArea className="h-[400px] border rounded-md mt-4 p-4">
                {loading && !containerLogs && !systemLogs && (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading..." />
                  </div>
                )}
                {error && (
                  <div className="text-center text-red-500 py-4">
                    {error}
                  </div>
                )}
                {!loading && !error && (
                  <div className="flex flex-col h-full justify-end">
                    <TabsContent value="system" className="mt-0">
                      {renderSystemLogs(systemLogs)}
                    </TabsContent>
                    <TabsContent value="event-handler" className="mt-0">
                      {renderLogContent(containerLogs['sothebais-event-handler-1'])}
                    </TabsContent>
                    <TabsContent value="auction-manager" className="mt-0">
                      {renderLogContent(containerLogs['sothebais-auction-manager-1'])}
                    </TabsContent>
                    <TabsContent value="traefik" className="mt-0">
                      {renderLogContent(containerLogs['sothebais-traefik-1'])}
                    </TabsContent>
                    <TabsContent value="redis" className="mt-0">
                      {renderLogContent(containerLogs['sothebais-redis-1'])}
                    </TabsContent>
                    <TabsContent value="prometheus" className="mt-0">
                      {renderLogContent(containerLogs['sothebais-prometheus-1'])}
                    </TabsContent>
                    <TabsContent value="grafana" className="mt-0">
                      {renderLogContent(containerLogs['sothebais-grafana-1'])}
                    </TabsContent>
                    <TabsContent value="admin-frontend" className="mt-0">
                      {renderLogContent(containerLogs['sothebais-admin-frontend-1'])}
                    </TabsContent>
                  </div>
                )}
              </ScrollArea>
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
} 