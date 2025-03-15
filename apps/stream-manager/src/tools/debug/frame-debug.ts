import { Session } from 'inspector';
import { logger } from '../../utils/logger.js';
import { metricsService } from '../../monitoring/metrics.js';
import { RTMPServer } from '../../streaming/rtmp/server.js';
import { loadConfig } from '../../config/index.js';

interface FrameStats {
  processingTime: number;
  size: number;
  quality: string;
  isBatched: boolean;
  timestamp: number;
  source: 'rtmp';
}

class FrameDebugger {
  private session: Session;
  private frameStats: FrameStats[] = [];
  private isAnalyzing = false;
  private rtmpServer: RTMPServer | null = null;
  private retryInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.session = new Session();
    this.session.connect();
    
    // Handle process termination
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  private cleanup() {
    this.isAnalyzing = false;
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
    this.session.disconnect();
    this.analyzeResults();
    process.exit(0);
  }

  private async waitForStream(): Promise<void> {
    return new Promise((resolve) => {
      const tryConnect = async () => {
        try {
          if (!this.rtmpServer) {
            const config = await loadConfig();
            this.rtmpServer = await RTMPServer.initialize({
              port: config.RTMP_PORT,
              chunk_size: config.RTMP_CHUNK_SIZE,
              gop_cache: config.RTMP_GOP_CACHE,
              ping: config.RTMP_PING,
              ping_timeout: config.RTMP_PING_TIMEOUT
            });

            logger.info('Connected to RTMP server', {
              component: 'frame-debug',
              port: config.RTMP_PORT
            });

            // Add event listeners
            this.rtmpServer.on('client_connected', (client: any) => {
              logger.info('RTMP client connected', {
                clientId: client.id,
                app: client.app
              });
            });

            this.rtmpServer.on('stream_started', (stream: any) => {
              logger.info('Stream started', {
                path: stream.path
              });
              this.handleStream(stream);
            });

            if (this.retryInterval) {
              clearInterval(this.retryInterval);
            }
            resolve();
          }
        } catch (error) {
          logger.debug('Waiting for RTMP server...', {
            component: 'frame-debug',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      };

      // Try immediately
      tryConnect();

      // Then retry every second
      this.retryInterval = setInterval(tryConnect, 1000);
    });
  }

  private handleStream(stream: any) {
    stream.on('data', (chunk: Buffer) => {
      const stats: FrameStats = {
        processingTime: 0, // Not applicable for raw RTMP
        size: chunk.length,
        quality: 'rtmp',
        isBatched: false,
        timestamp: Date.now(),
        source: 'rtmp'
      };

      this.frameStats.push(stats);
      this.logFrameStats(stats);

      // Record metrics
      metricsService.recordFrameSize(stats.size);
    });
  }

  async analyze() {
    try {
      this.isAnalyzing = true;
      logger.info('Starting frame analysis');

      // Wait for RTMP server
      logger.info('Waiting for RTMP stream...', {
        component: 'frame-debug'
      });
      
      await this.waitForStream();
      
      // Start periodic analysis
      this.startPeriodicAnalysis();

      logger.info('Frame debugger ready', {
        component: 'frame-debug',
        status: 'listening',
        url: 'rtmp://localhost:1935/live/test'
      });
    } catch (error) {
      logger.error('Failed to start frame analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'frame-debug'
      });
      this.cleanup();
    }
  }

  private startPeriodicAnalysis() {
    setInterval(() => {
      if (!this.isAnalyzing) return;

      const recentStats = this.frameStats.slice(-100);
      if (recentStats.length === 0) return;

      const analysis = this.analyzeFrameStats(recentStats);
      
      logger.info('Frame processing analysis', {
        ...analysis,
        component: 'frame-debug',
        timestamp: new Date().toISOString()
      });
    }, 5000);
  }

  private analyzeFrameStats(stats: FrameStats[]) {
    const totalFrames = stats.length;
    if (totalFrames === 0) return null;

    const averageProcessingTime = stats.reduce((sum, stat) => sum + stat.processingTime, 0) / totalFrames;
    const averageSize = stats.reduce((sum, stat) => sum + stat.size, 0) / totalFrames;
    const batchedFrames = stats.filter(stat => stat.isBatched).length;
    
    const processingTimes = stats.map(stat => stat.processingTime);
    const p95ProcessingTime = this.calculatePercentile(processingTimes, 95);
    const p99ProcessingTime = this.calculatePercentile(processingTimes, 99);

    const firstStat = stats[0];
    const lastStat = stats[stats.length - 1];

    return {
      totalFrames,
      averageProcessingTime,
      p95ProcessingTime,
      p99ProcessingTime,
      averageSize,
      batchedFrames,
      batchRatio: batchedFrames / totalFrames,
      timeRange: {
        start: firstStat ? firstStat.timestamp : Date.now(),
        end: lastStat ? lastStat.timestamp : Date.now()
      }
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0; // Provide default of 0 if undefined
  }

  private logFrameStats(stats: FrameStats) {
    logger.debug('Frame processed', {
      component: 'frame-debug',
      source: stats.source,
      size: stats.size,
      processingTime: stats.processingTime,
      isBatched: stats.isBatched,
      timestamp: new Date(stats.timestamp).toISOString()
    });
  }

  private analyzeResults() {
    const finalAnalysis = this.analyzeFrameStats(this.frameStats);
    
    logger.info('Frame analysis complete', {
      ...finalAnalysis,
      component: 'frame-debug',
      status: 'completed',
      timestamp: new Date().toISOString()
    });
  }
}

// Start the debugger if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const frameDebugger = new FrameDebugger();
  frameDebugger.analyze().catch(error => {
    logger.error('Frame debugger failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      component: 'frame-debug'
    });
    process.exit(1);
  });
} 