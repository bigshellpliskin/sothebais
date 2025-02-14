import { createHook } from 'async_hooks';
import type { AsyncHook } from 'async_hooks';
import { performance } from 'perf_hooks';
import { logger } from '../../utils/logger.js';
import { metricsService } from '../../monitoring/metrics.js';

interface NetworkEvent {
  timestamp: number;
  type: 'before' | 'after';
  data?: any;
}

interface NetworkConnection {
  id: number;
  protocol: 'ws' | 'rtmp';
  startTime: number;
  events: NetworkEvent[];
  bytesReceived: number;
  bytesSent: number;
  status: 'active' | 'closed';
  error?: Error;
}

interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  totalBytesReceived: number;
  totalBytesSent: number;
  errorRate: number;
  timeRange: {
    start: number;
    end: number;
  };
}

class NetworkTracer {
  private hook: AsyncHook;
  private connections = new Map<number, NetworkConnection>();
  private isAnalyzing = false;
  private analysisInterval: NodeJS.Timeout | null = null;
  private readonly protocol: 'ws' | 'rtmp';

  constructor(protocol: 'ws' | 'rtmp') {
    this.protocol = protocol;

    // Create async hook to track network operations
    this.hook = createHook({
      init: (asyncId, type, triggerAsyncId) => {
        if (type === 'TCPWRAP' || type === 'TLSWRAP') {
          this.connections.set(asyncId, {
            id: asyncId,
            protocol: this.protocol,
            startTime: performance.now(),
            events: [],
            bytesReceived: 0,
            bytesSent: 0,
            status: 'active'
          });
        }
      },
      before: (asyncId) => {
        const connection = this.connections.get(asyncId);
        if (connection) {
          connection.events.push({
            timestamp: performance.now(),
            type: 'before'
          });
        }
      },
      after: (asyncId) => {
        const connection = this.connections.get(asyncId);
        if (connection) {
          connection.events.push({
            timestamp: performance.now(),
            type: 'after'
          });
          this.analyzeLatency(connection);
        }
      },
      destroy: (asyncId) => {
        const connection = this.connections.get(asyncId);
        if (connection) {
          connection.status = 'closed';
          this.logConnectionClosed(connection);
          this.connections.delete(asyncId);
        }
      }
    });

    // Handle process termination
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  startAnalysis() {
    try {
      this.isAnalyzing = true;
      this.hook.enable();

      logger.info('Starting network analysis', {
        component: 'network-trace',
        protocol: this.protocol,
        status: 'started'
      });

      // Start periodic analysis
      this.analysisInterval = setInterval(() => {
        this.analyzeConnections();
      }, 5000);

    } catch (error) {
      logger.error('Failed to start network analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'network-trace',
        protocol: this.protocol
      });
      this.cleanup();
    }
  }

  private cleanup() {
    this.isAnalyzing = false;
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    this.hook.disable();
    this.analyzeConnections();
    process.exit(0);
  }

  private analyzeLatency(connection: NetworkConnection) {
    const events = connection.events;
    if (events.length < 2) return;

    // Calculate latency between before/after pairs
    const latencies = [];
    for (let i = 0; i < events.length - 1; i += 2) {
      if (events[i].type === 'before' && events[i + 1]?.type === 'after') {
        const latency = events[i + 1].timestamp - events[i].timestamp;
        latencies.push(latency);
      }
    }

    if (latencies.length === 0) return;

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    // Record metrics based on protocol
    if (this.protocol === 'ws') {
      metricsService.recordWsMessageReceived('data');
    }

    logger.debug('Connection latency', {
      component: 'network-trace',
      protocol: this.protocol,
      connectionId: connection.id,
      avgLatency,
      events: events.length,
      status: connection.status
    });
  }

  private analyzeConnections() {
    const stats = this.calculateConnectionStats();
    
    logger.info('Network analysis', {
      component: 'network-trace',
      protocol: this.protocol,
      ...stats,
      timestamp: new Date().toISOString()
    });

    // Record active connections metric
    if (this.protocol === 'ws') {
      metricsService.recordWsConnection('active');
    }
  }

  private calculateConnectionStats(): ConnectionStats {
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.status === 'active');

    const allLatencies = Array.from(this.connections.values())
      .flatMap(conn => {
        const latencies = [];
        for (let i = 0; i < conn.events.length - 1; i += 2) {
          if (conn.events[i].type === 'before' && conn.events[i + 1]?.type === 'after') {
            latencies.push(conn.events[i + 1].timestamp - conn.events[i].timestamp);
          }
        }
        return latencies;
      });

    const totalBytes = Array.from(this.connections.values())
      .reduce((acc, conn) => ({
        received: acc.received + conn.bytesReceived,
        sent: acc.sent + conn.bytesSent
      }), { received: 0, sent: 0 });

    const errorCount = Array.from(this.connections.values())
      .filter(conn => conn.error).length;

    return {
      totalConnections: this.connections.size,
      activeConnections: activeConnections.length,
      avgLatency: allLatencies.length > 0
        ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
        : 0,
      p95Latency: this.calculatePercentile(allLatencies, 95),
      p99Latency: this.calculatePercentile(allLatencies, 99),
      totalBytesReceived: totalBytes.received,
      totalBytesSent: totalBytes.sent,
      errorRate: this.connections.size > 0
        ? errorCount / this.connections.size
        : 0,
      timeRange: {
        start: Math.min(...Array.from(this.connections.values()).map(c => c.startTime)),
        end: performance.now()
      }
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  private logConnectionClosed(connection: NetworkConnection) {
    const duration = performance.now() - connection.startTime;
    
    logger.info('Connection closed', {
      component: 'network-trace',
      protocol: this.protocol,
      connectionId: connection.id,
      duration,
      bytesReceived: connection.bytesReceived,
      bytesSent: connection.bytesSent,
      error: connection.error?.message
    });
  }
}

// Start the tracer if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const protocol = process.argv[2] as 'ws' | 'rtmp';
  if (!protocol || !['ws', 'rtmp'].includes(protocol)) {
    console.error('Please specify protocol: ws or rtmp');
    process.exit(1);
  }

  const tracer = new NetworkTracer(protocol);
  tracer.startAnalysis();
} 