import { StreamMetrics } from '../types/stream';
import client from 'prom-client';

// Create metrics
const streamFPS = new client.Gauge({
  name: 'stream_fps',
  help: 'Current FPS of the stream'
});

const streamBitrate = new client.Gauge({
  name: 'stream_bitrate',
  help: 'Current bitrate of the stream in bits per second'
});

const streamDroppedFrames = new client.Counter({
  name: 'stream_dropped_frames_total',
  help: 'Total number of dropped frames'
});

const streamEncoderLatency = new client.Gauge({
  name: 'stream_encoder_latency_ms',
  help: 'Current encoder latency in milliseconds'
});

const streamBufferHealth = new client.Gauge({
  name: 'stream_buffer_health_percent',
  help: 'Current buffer health as a percentage'
});

const processMemoryUsage = new client.Gauge({
  name: 'process_memory_bytes',
  help: 'Memory usage of the process in bytes'
});

const processCPUUsage = new client.Gauge({
  name: 'process_cpu_usage_percent',
  help: 'CPU usage of the process as a percentage'
});

// Enable default metrics (garbage collection, memory usage, etc)
client.collectDefaultMetrics({
  prefix: 'stream_manager_'
});

class MetricsCollector {
  private metrics: StreamMetrics = {
    fps: 0,
    bitrate: 0,
    droppedFrames: 0,
    encoderLatency: 0,
    bufferHealth: 100,
    cpuUsage: 0,
    memoryUsage: 0
  };

  private frameCount = 0;
  private lastFrameTime = Date.now();
  private fpsUpdateInterval = 1000; // Update FPS every second

  updateFPS(): void {
    const now = Date.now();
    const elapsed = now - this.lastFrameTime;
    
    if (elapsed >= this.fpsUpdateInterval) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / elapsed);
      streamFPS.set(this.metrics.fps);
      this.frameCount = 0;
      this.lastFrameTime = now;
    } else {
      this.frameCount++;
    }
  }

  updateResourceUsage(): void {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage = Math.round(usage.heapUsed / 1024 / 1024); // Convert to MB
    processMemoryUsage.set(usage.heapUsed);
    
    // Note: CPU usage calculation would be platform-specific
    // This is a placeholder for now
    this.metrics.cpuUsage = 0;
    processCPUUsage.set(this.metrics.cpuUsage);
  }

  updateStreamMetrics(params: Partial<StreamMetrics>): void {
    Object.assign(this.metrics, params);
    
    // Update Prometheus metrics
    if (params.bitrate !== undefined) {
      streamBitrate.set(params.bitrate);
    }
    if (params.droppedFrames !== undefined) {
      streamDroppedFrames.inc(params.droppedFrames - this.metrics.droppedFrames);
    }
    if (params.encoderLatency !== undefined) {
      streamEncoderLatency.set(params.encoderLatency);
    }
    if (params.bufferHealth !== undefined) {
      streamBufferHealth.set(params.bufferHealth);
    }
  }

  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      fps: 0,
      bitrate: 0,
      droppedFrames: 0,
      encoderLatency: 0,
      bufferHealth: 100,
      cpuUsage: 0,
      memoryUsage: 0
    };
    this.frameCount = 0;
    this.lastFrameTime = Date.now();
  }

  // Expose metrics endpoint for Prometheus
  async getPrometheusMetrics(): Promise<string> {
    return client.register.metrics();
  }

  // Get content type for Prometheus metrics
  getMetricsContentType(): string {
    return client.register.contentType;
  }
}

export const metricsCollector = new MetricsCollector(); 