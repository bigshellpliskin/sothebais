import { EventEmitter } from 'events';
import { cpus } from 'os';
import { performance } from 'perf_hooks';
import type { WorkerMetrics, BatchMetrics } from '../shared/messages.js';
import type { PoolState } from '../shared/state.js';
import { logger } from '../../utils/logger.js';

interface CPUUsage {
  user: number;
  system: number;
  idle: number;
  total: number;
}

export interface PoolMetrics extends WorkerMetrics {
  activeWorkers: number;
  totalWorkers: number;
  queueLength: number;
  queueUtilization: number;
  batchesInProgress: number;
  averageBatchProgress: number;
  resourceUtilization: {
    cpu: {
      total: number;
      perCore: number[];
      user: number;
      system: number;
    };
    memory: number;
  };
  timestamp: number;
}

export class MetricsCollector extends EventEmitter {
  private static instance: MetricsCollector | null = null;
  private metricsHistory: PoolMetrics[] = [];
  private readonly MAX_HISTORY = 100;
  private lastCPUUsage: CPUUsage[] | null = null;
  private lastCPUTime: number = 0;

  private constructor() {
    super();
    this.initializeCPUMonitoring();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private initializeCPUMonitoring(): void {
    // Initialize CPU monitoring with first reading
    this.lastCPUUsage = this.getCurrentCPUUsage();
    this.lastCPUTime = performance.now();
  }

  private getCurrentCPUUsage(): CPUUsage[] {
    return cpus().map(cpu => ({
      user: cpu.times.user,
      system: cpu.times.sys,
      idle: cpu.times.idle,
      total: cpu.times.user + cpu.times.sys + cpu.times.idle
    }));
  }

  private calculateCPUUsage(): { total: number; perCore: number[]; user: number; system: number } {
    const currentUsage = this.getCurrentCPUUsage();
    const currentTime = performance.now();

    if (!this.lastCPUUsage) {
      this.lastCPUUsage = currentUsage;
      this.lastCPUTime = currentTime;
      return {
        total: 0,
        perCore: currentUsage.map(() => 0),
        user: 0,
        system: 0
      };
    }

    const timeDiff = currentTime - this.lastCPUTime;
    const cpuUsage = currentUsage.map((current, index) => {
      const last = this.lastCPUUsage![index];
      const totalDiff = current.total - last.total;
      const idleDiff = current.idle - last.idle;
      const userDiff = current.user - last.user;
      const systemDiff = current.system - last.system;

      return {
        total: totalDiff > 0 ? (1 - idleDiff / totalDiff) * 100 : 0,
        user: totalDiff > 0 ? (userDiff / totalDiff) * 100 : 0,
        system: totalDiff > 0 ? (systemDiff / totalDiff) * 100 : 0
      };
    });

    // Update last readings
    this.lastCPUUsage = currentUsage;
    this.lastCPUTime = currentTime;

    const totalCPU = cpuUsage.reduce((acc, curr) => acc + curr.total, 0) / cpuUsage.length;
    const totalUser = cpuUsage.reduce((acc, curr) => acc + curr.user, 0) / cpuUsage.length;
    const totalSystem = cpuUsage.reduce((acc, curr) => acc + curr.system, 0) / cpuUsage.length;

    return {
      total: totalCPU,
      perCore: cpuUsage.map(core => core.total),
      user: totalUser,
      system: totalSystem
    };
  }

  public collectMetrics(state: PoolState, queueSize: number): PoolMetrics {
    const activeWorkers = Array.from(state.workers.values()).filter(w => w.isProcessing).length;
    const totalWorkers = state.workers.size;

    // Calculate basic metrics
    let totalTasks = 0;
    let completedTasks = 0;
    let totalProcessingTime = 0;
    let totalErrors = 0;

    for (const workerState of state.workers.values()) {
      completedTasks += workerState.processedTasks;
      totalProcessingTime += workerState.totalProcessingTime;
      totalErrors += workerState.errors;
    }

    totalTasks = completedTasks + state.taskQueue.length;

    // Calculate queue metrics
    const queueLength = state.taskQueue.length;
    const queueUtilization = queueLength / queueSize;

    // Calculate batch metrics
    const batchesInProgress = state.batchMetrics.size;
    let totalBatchProgress = 0;

    for (const batch of state.batchMetrics.values()) {
      totalBatchProgress += batch.completedTasks / (batch.totalTasks || 1);
    }

    const averageBatchProgress = batchesInProgress > 0 ? 
      totalBatchProgress / batchesInProgress : 0;

    // Calculate task priority distribution
    const tasksByPriority = {
      high: state.taskQueue.filter(t => t.priority === 'high').length,
      normal: state.taskQueue.filter(t => t.priority === 'normal').length,
      low: state.taskQueue.filter(t => t.priority === 'low').length
    };

    // Calculate resource utilization
    const cpuUsage = this.calculateCPUUsage();
    const memoryUsage = process.memoryUsage();
    const resourceUtilization = {
      cpu: cpuUsage,
      memory: memoryUsage.heapTotal > 0 ? memoryUsage.heapUsed / memoryUsage.heapTotal : 0
    };

    const metrics: PoolMetrics = {
      totalTasks,
      completedTasks,
      totalProcessingTime,
      activeWorkers,
      totalWorkers,
      queueLength,
      queueUtilization,
      batchesInProgress,
      averageBatchProgress,
      tasksByPriority,
      averageProcessingTime: completedTasks > 0 ? totalProcessingTime / completedTasks : 0,
      errorRate: completedTasks > 0 ? totalErrors / completedTasks : 0,
      memoryUsage: memoryUsage.heapUsed,
      resourceUtilization,
      timestamp: Date.now()
    };

    this.updateHistory(metrics);
    this.emit('metrics', metrics);

    // Log metrics at appropriate intervals
    logger.logMetrics({
      type: 'worker_pool',
      ...metrics,
      cpuUsage: {
        total: Math.round(cpuUsage.total * 100) / 100,
        user: Math.round(cpuUsage.user * 100) / 100,
        system: Math.round(cpuUsage.system * 100) / 100
      }
    });

    return metrics;
  }

  private updateHistory(metrics: PoolMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.MAX_HISTORY) {
      this.metricsHistory.shift();
    }
  }

  public getHistory(duration?: number): PoolMetrics[] {
    if (!duration) {
      return this.metricsHistory;
    }

    const now = Date.now();
    return this.metricsHistory.filter(m => now - m.timestamp < duration);
  }

  public getAverages(duration?: number): Partial<PoolMetrics> {
    const history = this.getHistory(duration);
    if (history.length === 0) {
      return {};
    }

    const sums = history.reduce((acc, metrics) => ({
      totalTasks: acc.totalTasks + metrics.totalTasks,
      completedTasks: acc.completedTasks + metrics.completedTasks,
      totalProcessingTime: acc.totalProcessingTime + metrics.totalProcessingTime,
      activeWorkers: acc.activeWorkers + metrics.activeWorkers,
      queueLength: acc.queueLength + metrics.queueLength,
      queueUtilization: acc.queueUtilization + metrics.queueUtilization,
      errorRate: acc.errorRate + metrics.errorRate,
      memoryUsage: acc.memoryUsage + metrics.memoryUsage
    }), {
      totalTasks: 0,
      completedTasks: 0,
      totalProcessingTime: 0,
      activeWorkers: 0,
      queueLength: 0,
      queueUtilization: 0,
      errorRate: 0,
      memoryUsage: 0
    });

    const count = history.length;
    return {
      totalTasks: Math.round(sums.totalTasks / count),
      completedTasks: Math.round(sums.completedTasks / count),
      totalProcessingTime: Math.round(sums.totalProcessingTime / count),
      activeWorkers: Math.round(sums.activeWorkers / count),
      queueLength: Math.round(sums.queueLength / count),
      queueUtilization: sums.queueUtilization / count,
      errorRate: sums.errorRate / count,
      memoryUsage: Math.round(sums.memoryUsage / count)
    };
  }

  public reset(): void {
    this.metricsHistory = [];
    this.emit('reset');
  }
}

