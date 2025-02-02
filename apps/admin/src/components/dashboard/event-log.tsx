"use client";

import { useEffect, useState } from 'react';
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

  // Set isClient to true on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get the base URL for event handler
  const getEventHandlerUrl = () => {
    // In development, use direct connection to event-handler
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:4300';
    }
    // In production, use Traefik-routed URL
    return '/events';
  };

  // Load container logs and system logs
  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const baseUrl = getEventHandlerUrl();

        const [containerResponse, systemResponse] = await Promise.all([
          fetch(`${baseUrl}/logs`, {
            headers: {
              'Accept': 'application/json'
            }
          }),
          fetch(`${baseUrl}/system-logs`, {
            headers: {
              'Accept': 'application/json'
            }
          })
        ]);

        if (!containerResponse.ok) {
          throw new Error(`Container logs failed: ${containerResponse.status}`);
        }
        if (!systemResponse.ok) {
          throw new Error(`System logs failed: ${systemResponse.status}`);
        }

        const [containerLogsData, systemLogsData] = await Promise.all([
          containerResponse.json(),
          systemResponse.json()
        ]);

        // Ensure container logs are serializable
        const processedContainerLogs = Object.fromEntries(
          Object.entries(containerLogsData).map(([key, logs]) => [
            key,
            (logs as LogEntry[]).map(log => ({
              ...log,
              timestamp: new Date(log.timestamp).toISOString(),
            }))
          ])
        );

        // Ensure system logs are serializable
        const processedSystemLogs = systemLogsData.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp).toISOString(),
          context: typeof log.context === 'object' ? JSON.stringify(log.context) : String(log.context || '')
        }));

        setContainerLogs(processedContainerLogs);
        setSystemLogs(processedSystemLogs);
        setError(null);
      } catch (err) {
        console.error('Failed to load logs:', err);
        setError(err instanceof Error ? err.message : 'Failed to load logs');
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
    const interval = setInterval(loadLogs, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Don't render anything until we're on the client
  if (!isClient) {
    return null;
  }

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'bg-red-500';
      case 'warn': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      case 'debug': return 'bg-gray-500';
      default: return 'bg-gray-500';
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

    return logs.map((log) => {
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
            <Badge variant="outline" className={`${getLevelColor(log.level)} text-white`}>
              {log.level}
            </Badge>
            <Badge variant="outline">{log.service}</Badge>
            <Badge variant="outline">{log.component}</Badge>
            {log.state && <Badge variant="outline">{log.state}</Badge>}
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

    return entries.map((entry: any, index: number) => {
      const date = new Date(entry.timestamp);
      const timestamp = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const content = entry.content || (typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2)) || '';
      
      return (
        <div
          key={generateUniqueKey(entry, index)}
          className="font-mono text-xs leading-relaxed border-b border-border/50 last:border-0"
        >
          <span className="text-muted-foreground">[{timestamp}]</span>{' '}
          <span className="text-primary">$</span>{' '}
          <span className="text-foreground whitespace-pre-wrap">{content}</span>
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
                <>
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
                </>
              )}
            </ScrollArea>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
} 