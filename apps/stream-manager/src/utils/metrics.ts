import { StreamMetrics } from '../types/stream';

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
      this.frameCount = 0;
      this.lastFrameTime = now;
    } else {
      this.frameCount++;
    }
  }

  updateResourceUsage(): void {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage = Math.round(usage.heapUsed / 1024 / 1024); // Convert to MB
    
    // Note: CPU usage calculation would be platform-specific
    // This is a placeholder for now
    this.metrics.cpuUsage = 0;
  }

  updateStreamMetrics(params: Partial<StreamMetrics>): void {
    Object.assign(this.metrics, params);
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
}

export const metricsCollector = new MetricsCollector(); 