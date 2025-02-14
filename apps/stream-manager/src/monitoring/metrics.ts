import { Registry, Counter, Gauge, Histogram } from 'prom-client';
import { logger } from '../utils/logger.js';

export class MetricsService {
  private static instance: MetricsService | null = null;
  private registry: Registry;

  // WebSocket metrics
  private wsConnectionsTotal: Counter;
  private wsConnectionsActive: Gauge;
  private wsMessagesSentTotal: Counter;
  private wsMessagesReceivedTotal: Counter;
  private wsFrameSize: Histogram;
  private wsBatchSize: Histogram;

  // State metrics
  private stateUpdatesTotal: Counter;
  private statePersistenceLatency: Histogram;
  private redisOperationLatency: Histogram;

  // Stream metrics
  private streamFps: Gauge;
  private streamDroppedFrames: Counter;
  private streamRenderTime: Histogram;
  private streamActiveClients: Gauge;

  private constructor() {
    this.registry = new Registry();

    // WebSocket metrics
    this.wsConnectionsTotal = new Counter({
      name: 'ws_connections_total',
      help: 'Total number of WebSocket connections',
      registers: [this.registry],
      labelNames: ['quality']
    });

    this.wsConnectionsActive = new Gauge({
      name: 'ws_connections_active',
      help: 'Number of currently active WebSocket connections',
      registers: [this.registry],
      labelNames: ['quality']
    });

    this.wsMessagesSentTotal = new Counter({
      name: 'ws_messages_sent_total',
      help: 'Total number of WebSocket messages sent',
      registers: [this.registry],
      labelNames: ['type']
    });

    this.wsMessagesReceivedTotal = new Counter({
      name: 'ws_messages_received_total',
      help: 'Total number of WebSocket messages received',
      registers: [this.registry],
      labelNames: ['type']
    });

    this.wsFrameSize = new Histogram({
      name: 'ws_frame_size_bytes',
      help: 'Size of WebSocket frames in bytes',
      registers: [this.registry],
      buckets: [1000, 5000, 10000, 50000, 100000]
    });

    this.wsBatchSize = new Histogram({
      name: 'ws_batch_size_frames',
      help: 'Number of frames in each batch',
      registers: [this.registry],
      buckets: [1, 2, 3, 4, 5]
    });

    // State metrics
    this.stateUpdatesTotal = new Counter({
      name: 'state_updates_total',
      help: 'Total number of state updates',
      registers: [this.registry],
      labelNames: ['type']
    });

    this.statePersistenceLatency = new Histogram({
      name: 'state_persistence_latency_seconds',
      help: 'Latency of state persistence operations',
      registers: [this.registry],
      buckets: [0.1, 0.5, 1, 2, 5]
    });

    this.redisOperationLatency = new Histogram({
      name: 'redis_operation_latency_seconds',
      help: 'Latency of Redis operations',
      registers: [this.registry],
      labelNames: ['operation'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1]
    });

    // Stream metrics
    this.streamFps = new Gauge({
      name: 'stream_fps',
      help: 'Current stream FPS',
      registers: [this.registry]
    });

    this.streamDroppedFrames = new Counter({
      name: 'stream_dropped_frames_total',
      help: 'Total number of dropped frames',
      registers: [this.registry]
    });

    this.streamRenderTime = new Histogram({
      name: 'stream_render_time_seconds',
      help: 'Time taken to render frames',
      registers: [this.registry],
      buckets: [0.016, 0.033, 0.066, 0.1, 0.2] // Corresponds to 60fps, 30fps, 15fps thresholds
    });

    this.streamActiveClients = new Gauge({
      name: 'stream_active_clients',
      help: 'Number of active streaming clients',
      registers: [this.registry],
      labelNames: ['quality']
    });
  }

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  // WebSocket metrics methods
  public recordWsConnection(quality: string): void {
    this.wsConnectionsTotal.inc({ quality });
    this.wsConnectionsActive.inc({ quality });
  }

  public recordWsDisconnection(quality: string): void {
    this.wsConnectionsActive.dec({ quality });
  }

  public recordWsMessageSent(type: string): void {
    this.wsMessagesSentTotal.inc({ type });
  }

  public recordWsMessageReceived(type: string): void {
    this.wsMessagesReceivedTotal.inc({ type });
  }

  public recordFrameSize(sizeBytes: number): void {
    this.wsFrameSize.observe(sizeBytes);
  }

  public recordBatchSize(numFrames: number): void {
    this.wsBatchSize.observe(numFrames);
  }

  // State metrics methods
  public recordStateUpdate(type: string): void {
    this.stateUpdatesTotal.inc({ type });
  }

  public recordStatePersistenceLatency(seconds: number): void {
    this.statePersistenceLatency.observe(seconds);
  }

  public recordRedisOperationLatency(operation: string, seconds: number): void {
    this.redisOperationLatency.observe({ operation }, seconds);
  }

  // Stream metrics methods
  public updateStreamFps(fps: number): void {
    this.streamFps.set(fps);
  }

  public recordDroppedFrame(): void {
    this.streamDroppedFrames.inc();
  }

  public recordRenderTime(seconds: number): void {
    this.streamRenderTime.observe(seconds);
  }

  public updateActiveClients(quality: string, count: number): void {
    this.streamActiveClients.set({ quality }, count);
  }

  // Registry access
  public getRegistry(): Registry {
    return this.registry;
  }

  // Metrics endpoint data
  public async getMetrics(): Promise<string> {
    try {
      return await this.registry.metrics();
    } catch (error) {
      logger.error('Error collecting metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

export const metricsService = MetricsService.getInstance(); 