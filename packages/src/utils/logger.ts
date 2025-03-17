/**
 * Shared Logger Utility
 * 
 * Provides consistent logging across all services in the SothebAIs platform.
 * This centralized logger can be configured to output to different destinations
 * based on the environment (console, file, external service, etc.)
 */

/**
 * Log levels supported by the logger
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Logger interface that all logger implementations must follow
 */
export interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  fatal(message: string, meta?: Record<string, any>): void;
}

/**
 * Configuration options for the logger
 */
export interface LoggerConfig {
  service: string;
  level?: LogLevel;
  environment?: string;
  additionalMeta?: Record<string, any>;
}

/**
 * Default logger implementation that logs to the console
 * In production, this could be replaced with a more robust solution
 */
class ConsoleLogger implements Logger {
  private service: string;
  private level: LogLevel;
  private environment: string;
  private additionalMeta: Record<string, any>;

  constructor(config: LoggerConfig) {
    this.service = config.service;
    this.level = config.level || LogLevel.INFO;
    this.environment = config.environment || process.env['NODE_ENV'] || 'development';
    this.additionalMeta = config.additionalMeta || {};
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
      [LogLevel.FATAL]: 4
    };

    return levels[level] >= levels[this.level];
  }

  private formatMeta(meta: Record<string, any> = {}): Record<string, any> {
    return {
      ...this.additionalMeta,
      ...meta,
      service: this.service,
      environment: this.environment,
      timestamp: new Date().toISOString()
    };
  }

  debug(message: string, meta: Record<string, any> = {}): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`[DEBUG] [${this.service}] ${message}`, this.formatMeta(meta));
    }
  }

  info(message: string, meta: Record<string, any> = {}): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`[INFO] [${this.service}] ${message}`, this.formatMeta(meta));
    }
  }

  warn(message: string, meta: Record<string, any> = {}): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] [${this.service}] ${message}`, this.formatMeta(meta));
    }
  }

  error(message: string, meta: Record<string, any> = {}): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] [${this.service}] ${message}`, this.formatMeta(meta));
    }
  }

  fatal(message: string, meta: Record<string, any> = {}): void {
    if (this.shouldLog(LogLevel.FATAL)) {
      console.error(`[FATAL] [${this.service}] ${message}`, this.formatMeta(meta));
    }
  }
}

/**
 * Factory function to create a new logger instance for a service
 */
export function createLogger(service: string, config: Partial<LoggerConfig> = {}): Logger {
  return new ConsoleLogger({
    service,
    ...config
  });
}

/**
 * Global default logger (use sparingly)
 */
export const logger = createLogger('global'); 