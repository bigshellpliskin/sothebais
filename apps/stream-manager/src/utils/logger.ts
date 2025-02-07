import pino from 'pino';
import type { Config } from '../config/index.js';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogContext {
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private logger: ReturnType<typeof pino>;
  private initialized = false;
  private metricsLogInterval = 10000; // Log metrics every 10 seconds
  private lastMetricsLog = 0;

  constructor() {
    // Create a basic logger until properly initialized
    this.logger = pino({
      level: 'info',
      // Remove transport configuration to write directly to stdout
    });
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public initialize(config: Config): void {
    if (this.initialized) {
      return;
    }

    this.logger = pino({
      level: config.LOG_LEVEL || 'info',
      // Remove transport configuration to write directly to stdout
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
    });

    this.initialized = true;
    this.info('Logger initialized', { level: config.LOG_LEVEL });
  }

  private ensureLogger(): void {
    if (!this.initialized) {
      // TODO: Initialize with proper config when available
      this.initialized = true;
    }
  }

  public info(message: string, context?: LogContext): void {
    this.ensureLogger();
    this.logger.info(context || {}, message);
  }

  public error(message: string, context?: LogContext): void {
    this.ensureLogger();
    this.logger.error(context || {}, message);
  }

  public warn(message: string, context?: LogContext): void {
    this.ensureLogger();
    this.logger.warn(context || {}, message);
  }

  public debug(message: string, context?: LogContext): void {
    this.ensureLogger();
    this.logger.debug(context || {}, message);
  }

  public trace(message: string, context?: LogContext): void {
    this.ensureLogger();
    this.logger.trace(context || {}, message);
  }

  // Specialized logging methods for specific contexts
  public logMetrics(metrics: LogContext): void {
    const now = Date.now();
    if (now - this.lastMetricsLog >= this.metricsLogInterval) {
      this.info('Performance metrics update', { type: 'metrics', ...metrics });
      this.lastMetricsLog = now;
    }
  }

  public logLayerEvent(event: string, layerId: string, data?: LogContext): void {
    this.debug('Layer event: ' + event, { 
      type: 'layer', 
      event, 
      layerId, 
      ...data 
    });
  }

  public logStreamEvent(event: string, data?: LogContext): void {
    this.info('Stream event: ' + event, { 
      type: 'stream', 
      event, 
      ...data 
    });
  }

  public logWebSocketEvent(event: string, clientId?: string, data?: LogContext): void {
    this.debug('WebSocket event: ' + event, { 
      type: 'websocket', 
      event, 
      clientId, 
      ...data 
    });
  }
}

export const logger = Logger.getInstance();

// Export the class for testing or specialized instances
export { Logger }; 
