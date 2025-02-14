import v8 from 'v8';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { metricsService } from '../../monitoring/metrics.js';

interface HeapStats {
  totalHeapSize: number;
  totalHeapSizeExecutable: number;
  totalPhysicalSize: number;
  totalAvailableSize: number;
  usedHeapSize: number;
  heapSizeLimit: number;
  mallocedMemory: number;
  peakMallocedMemory: number;
  doesZapGarbage: boolean;
}

interface LeakCandidate {
  name: string;
  size: number;
  retainedSize: number;
  referenceCount: number;
  type: string;
}

class HeapAnalyzer {
  private snapshotInterval: NodeJS.Timeout | null = null;
  private snapshotCount = 0;
  private readonly maxSnapshots = 5;
  private readonly snapshotDir: string;
  private isAnalyzing = false;

  constructor() {
    this.snapshotDir = path.join(process.cwd(), 'heap-snapshots');
    this.ensureSnapshotDir();

    // Handle process termination
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  private ensureSnapshotDir() {
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }
  }

  startAnalysis() {
    try {
      this.isAnalyzing = true;
      logger.info('Starting heap analysis', {
        component: 'heap-analyzer',
        status: 'started'
      });

      // Take initial snapshot
      this.takeSnapshot();

      // Start periodic analysis
      this.snapshotInterval = setInterval(() => {
        this.analyzeHeap();
        
        // Take new snapshot if under limit
        if (this.snapshotCount < this.maxSnapshots) {
          this.takeSnapshot();
        }
      }, 30000); // Every 30 seconds

    } catch (error) {
      logger.error('Failed to start heap analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'heap-analyzer'
      });
      this.cleanup();
    }
  }

  private cleanup() {
    this.isAnalyzing = false;
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
    }
    this.analyzeHeap();
    process.exit(0);
  }

  private takeSnapshot() {
    try {
      const timestamp = Date.now();
      const snapshotPath = path.join(
        this.snapshotDir,
        `heap-${timestamp}.heapsnapshot`
      );

      const snapshot = v8.getHeapSnapshot();
      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot));
      
      this.snapshotCount++;
      
      logger.info('Heap snapshot taken', {
        component: 'heap-analyzer',
        path: snapshotPath,
        count: this.snapshotCount
      });

    } catch (error) {
      logger.error('Failed to take heap snapshot', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'heap-analyzer'
      });
    }
  }

  private analyzeHeap() {
    try {
      // Get current heap statistics
      const stats = v8.getHeapStatistics() as unknown as HeapStats;
      this.analyzeHeapStats(stats);

      // Look for memory leaks
      this.findLeakCandidates();

      // Clean up old snapshots if over limit
      this.cleanupOldSnapshots();

    } catch (error) {
      logger.error('Failed to analyze heap', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'heap-analyzer'
      });
    }
  }

  private analyzeHeapStats(stats: HeapStats) {
    if (!stats) {
      logger.error('Invalid heap stats', {
        component: 'heap-analyzer'
      });
      return;
    }

    const usedPercent = (stats.usedHeapSize / stats.heapSizeLimit) * 100;
    const physicalPercent = (stats.totalPhysicalSize / stats.heapSizeLimit) * 100;

    logger.info('Heap statistics', {
      component: 'heap-analyzer',
      usedHeapSize: this.formatBytes(stats.usedHeapSize),
      totalHeapSize: this.formatBytes(stats.totalHeapSize),
      heapSizeLimit: this.formatBytes(stats.heapSizeLimit),
      usedPercent: `${usedPercent.toFixed(1)}%`,
      physicalPercent: `${physicalPercent.toFixed(1)}%`,
      mallocedMemory: this.formatBytes(stats.mallocedMemory)
    });

    // Record metrics
    const heapUsedMB = stats.usedHeapSize / (1024 * 1024);
    metricsService.recordStatePersistenceLatency(heapUsedMB);
  }

  private findLeakCandidates(): LeakCandidate[] {
    const leakCandidates: LeakCandidate[] = [];
    
    try {
      // Note: v8.getHeapSnapshot() returns a Readable stream
      // We need to process it as a stream of heap data
      const snapshot = v8.getHeapSnapshot();
      let snapshotData = '';

      snapshot.on('data', (chunk) => {
        snapshotData += chunk;
      });

      snapshot.on('end', () => {
        try {
          const heapData = JSON.parse(snapshotData);
          
          // Process nodes from the parsed heap data
          if (heapData.nodes) {
            for (const node of heapData.nodes) {
              if (node.retainedSize > 1024 * 1024) { // Objects over 1MB
                leakCandidates.push({
                  name: node.name || 'Unknown',
                  size: node.selfSize,
                  retainedSize: node.retainedSize,
                  referenceCount: node.edgesCount,
                  type: node.type
                });
              }
            }
          }

          this.reportLeakCandidates(leakCandidates);
        } catch (error) {
          logger.error('Failed to parse heap snapshot', {
            error: error instanceof Error ? error.message : 'Unknown error',
            component: 'heap-analyzer'
          });
        }
      });

      snapshot.on('error', (error) => {
        logger.error('Error reading heap snapshot', {
          error: error instanceof Error ? error.message : 'Unknown error',
          component: 'heap-analyzer'
        });
      });

    } catch (error) {
      logger.error('Failed to get heap snapshot', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'heap-analyzer'
      });
    }

    return leakCandidates;
  }

  private reportLeakCandidates(candidates: LeakCandidate[]) {
    if (candidates.length === 0) {
      logger.info('No memory leak candidates found', {
        component: 'heap-analyzer'
      });
      return;
    }

    logger.warn('Potential memory leaks detected', {
      component: 'heap-analyzer',
      candidates: candidates.map(c => ({
        name: c.name,
        size: this.formatBytes(c.size),
        retainedSize: this.formatBytes(c.retainedSize),
        referenceCount: c.referenceCount,
        type: c.type
      }))
    });
  }

  private cleanupOldSnapshots() {
    try {
      const files = fs.readdirSync(this.snapshotDir)
        .filter(f => f.endsWith('.heapsnapshot'))
        .map(f => ({
          name: f,
          path: path.join(this.snapshotDir, f),
          time: fs.statSync(path.join(this.snapshotDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // Keep only the most recent snapshots
      const toDelete = files.slice(this.maxSnapshots);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        logger.info('Deleted old heap snapshot', {
          component: 'heap-analyzer',
          path: file.path
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup old snapshots', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'heap-analyzer'
      });
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// Start the analyzer if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new HeapAnalyzer();
  analyzer.startAnalysis();
} 