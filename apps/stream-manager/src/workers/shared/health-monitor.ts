import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';
import type { WorkerStatus } from './messages.js';

export interface HealthConfig {
  checkInterval: number;
  unhealthyThreshold: number;
  healthyThreshold: number;
  memoryThreshold: number;
  cpuThreshold: number;
}

export interface HealthMetrics {
  status: 'healthy' | 'unhealthy' | 'degraded';
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  lastCheck: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export class HealthMonitor extends EventEmitter {
  private healthMetrics: Map<number, HealthMetrics> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    private config: HealthConfig = {
      checkInterval: 5000,
      unhealthyThreshold: 3,
      healthyThreshold: 2,
      memoryThreshold: 0.9, // 90%
      cpuThreshold: 0.8 // 80%
    }
  ) {
    super();
    this.startMonitoring();
  }

  public registerWorker(workerId: number): void {
    this.healthMetrics.set(workerId, {
      status: 'healthy',
      memoryUsage: 0,
      cpuUsage: 0,
      errorRate: 0,
      lastCheck: Date.now(),
      consecutiveFailures: 0,
      consecutiveSuccesses: 0
    });
  }

  public unregisterWorker(workerId: number): void {
    this.healthMetrics.delete(workerId);
  }

  public updateWorkerStatus(workerId: number, status: WorkerStatus): void {
    const metrics = this.healthMetrics.get(workerId);
    if (!metrics) return;

    const now = Date.now();
    const memoryUsage = status.metrics.memory;
    const cpuUsage = status.metrics.cpu;
    const errorRate = status.metrics.errors / (status.metrics.tasks || 1);

    // Update metrics
    metrics.memoryUsage = memoryUsage;
    metrics.cpuUsage = cpuUsage;
    metrics.errorRate = errorRate;
    metrics.lastCheck = now;

    // Check health status
    const isHealthy = this.checkHealth(workerId, metrics);

    if (isHealthy) {
      metrics.consecutiveSuccesses++;
      metrics.consecutiveFailures = 0;
      if (metrics.status !== 'healthy' && 
          metrics.consecutiveSuccesses >= this.config.healthyThreshold) {
        this.transitionToHealthy(workerId, metrics);
      }
    } else {
      metrics.consecutiveFailures++;
      metrics.consecutiveSuccesses = 0;
      if (metrics.consecutiveFailures >= this.config.unhealthyThreshold) {
        this.transitionToUnhealthy(workerId, metrics);
      }
    }
  }

  private checkHealth(workerId: number, metrics: HealthMetrics): boolean {
    const checks = [
      // Memory check
      {
        name: 'memory',
        healthy: metrics.memoryUsage < this.config.memoryThreshold,
        value: Math.round(metrics.memoryUsage * 100) + '%'
      },
      // CPU check
      {
        name: 'cpu',
        healthy: metrics.cpuUsage < this.config.cpuThreshold,
        value: Math.round(metrics.cpuUsage * 100) + '%'
      },
      // Error rate check
      {
        name: 'error-rate',
        healthy: metrics.errorRate < 0.1, // 10% error rate threshold
        value: Math.round(metrics.errorRate * 100) + '%'
      }
    ];

    const unhealthyChecks = checks.filter(check => !check.healthy);
    
    if (unhealthyChecks.length > 0) {
      logger.warn('Worker health check failed', {
        workerId,
        failedChecks: unhealthyChecks.map(check => ({
          name: check.name,
          value: check.value
        }))
      });
    }

    return unhealthyChecks.length === 0;
  }

  private transitionToHealthy(workerId: number, metrics: HealthMetrics): void {
    const oldStatus = metrics.status;
    metrics.status = 'healthy';
    
    logger.info('Worker transitioned to healthy', {
      workerId,
      oldStatus,
      consecutiveSuccesses: metrics.consecutiveSuccesses
    });

    this.emit('workerHealthy', workerId);
  }

  private transitionToUnhealthy(workerId: number, metrics: HealthMetrics): void {
    const oldStatus = metrics.status;
    metrics.status = 'unhealthy';

    logger.warn('Worker transitioned to unhealthy', {
      workerId,
      oldStatus,
      consecutiveFailures: metrics.consecutiveFailures,
      metrics: {
        memory: Math.round(metrics.memoryUsage * 100) + '%',
        cpu: Math.round(metrics.cpuUsage * 100) + '%',
        errorRate: Math.round(metrics.errorRate * 100) + '%'
      }
    });

    this.emit('workerUnhealthy', workerId);
  }

  private startMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [workerId, metrics] of this.healthMetrics) {
        // Check for stale metrics
        if (now - metrics.lastCheck > this.config.checkInterval * 2) {
          logger.warn('Worker health metrics are stale', {
            workerId,
            lastCheck: new Date(metrics.lastCheck).toISOString(),
            timeSinceLastCheck: now - metrics.lastCheck
          });
          
          metrics.consecutiveFailures++;
          if (metrics.consecutiveFailures >= this.config.unhealthyThreshold) {
            this.transitionToUnhealthy(workerId, metrics);
          }
        }
      }
    }, this.config.checkInterval);
  }

  public getWorkerHealth(workerId: number): HealthMetrics | undefined {
    return this.healthMetrics.get(workerId);
  }

  public getAllWorkersHealth(): Map<number, HealthMetrics> {
    return new Map(this.healthMetrics);
  }

  public shutdown(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.healthMetrics.clear();
    this.removeAllListeners();
  }
} 