import { Session } from 'inspector';
import { logger } from '../../utils/logger.js';
import { metricsService } from '../../monitoring/metrics.js';

interface FrameStats {
  processingTime: number;
  size: number;
  quality: string;
  isBatched: boolean;
  timestamp: number;
}

class FrameDebugger {
  private session: Session;
  private frameStats: FrameStats[] = [];
  private isAnalyzing = false;
  
  constructor() {
    this.session = new Session();
    this.session.connect();
    
    // Handle process termination
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  private cleanup() {
    this.isAnalyzing = false;
    this.session.disconnect();
    this.analyzeResults();
    process.exit(0);
  }

  async analyze() {
    try {
      this.isAnalyzing = true;
      logger.info('Starting frame analysis');

      // Enable runtime and debugger
      await this.session.post('Runtime.enable');
      await this.session.post('Debugger.enable');

      // Set breakpoints in frame processing code
      await this.setBreakpoints();

      // Add expression watchers
      await this.setupWatchers();

      // Listen for frame events
      this.session.on('Debugger.paused', (params) => this.handleFrameEvent(params));

      // Start periodic analysis
      this.startPeriodicAnalysis();

      logger.info('Frame debugger ready', {
        component: 'frame-debug',
        status: 'listening'
      });
    } catch (error) {
      logger.error('Failed to start frame analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'frame-debug'
      });
      this.cleanup();
    }
  }

  private async setBreakpoints() {
    // Set breakpoints at key frame processing points
    const breakpoints = [
      { file: 'frame-handler.ts', line: 42, condition: 'frame !== null' },
      { file: 'message-batcher.ts', line: 76, condition: 'batch.frames.length > 0' }
    ];

    for (const bp of breakpoints) {
      await this.session.post('Debugger.setBreakpointByUrl', {
        lineNumber: bp.line,
        urlRegex: `.*${bp.file}$`,
        condition: bp.condition
      });
    }
  }

  private async setupWatchers() {
    // Watch frame-related variables
    const expressions = [
      'frame.size',
      'frame.quality',
      'this.processingTime',
      'batch.frames.length'
    ];

    for (const expr of expressions) {
      await this.session.post('Runtime.evaluate', {
        expression: expr,
        contextId: 1
      });
    }
  }

  private handleFrameEvent(params: any) {
    try {
      const frame = this.extractFrameData(params.callFrames[0]);
      
      if (frame) {
        this.frameStats.push(frame);
        this.logFrameStats(frame);
      }

      // Resume execution
      this.session.post('Debugger.resume');
    } catch (error) {
      logger.error('Error handling frame event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'frame-debug'
      });
    }
  }

  private extractFrameData(callFrame: any): FrameStats | null {
    try {
      const scope = callFrame.scopeChain[0].object;
      
      return {
        processingTime: scope.processingTime || 0,
        size: scope.size || 0,
        quality: scope.quality || 'unknown',
        isBatched: scope.isBatched || false,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error extracting frame data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'frame-debug'
      });
      return null;
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

      // Record metrics
      metricsService.recordFrameSize(analysis.averageSize);
      metricsService.recordRenderTime(analysis.averageProcessingTime / 1000);
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

    const qualityDistribution = stats.reduce((acc, stat) => {
      acc[stat.quality] = (acc[stat.quality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalFrames,
      averageProcessingTime,
      p95ProcessingTime,
      p99ProcessingTime,
      averageSize,
      batchedFrames,
      batchRatio: batchedFrames / totalFrames,
      qualityDistribution,
      timeRange: {
        start: stats[0].timestamp,
        end: stats[stats.length - 1].timestamp
      }
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  private logFrameStats(frame: FrameStats) {
    if (!frame) return;

    logger.debug('Frame processed', {
      processingTime: frame.processingTime,
      size: frame.size,
      quality: frame.quality,
      isBatched: frame.isBatched,
      timestamp: new Date().toISOString(),
      component: 'frame-debug'
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