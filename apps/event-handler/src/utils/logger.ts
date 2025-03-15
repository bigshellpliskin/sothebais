/**
 * Logger for the Event Handler Service
 * 
 * This module provides a custom logger for the event-handler service.
 */

// Define Logger interface with meta-first API
export interface Logger {
  debug(meta: Record<string, any>, message: string): void;
  info(meta: Record<string, any>, message: string): void;
  warn(meta: Record<string, any>, message: string): void;
  error(meta: Record<string, any>, message: string): void;
  fatal(meta: Record<string, any>, message: string): void;
}

/**
 * Default logger implementation that logs to the console
 */
class EventHandlerLogger implements Logger {
  private service: string;

  constructor() {
    this.service = 'event-handler';
  }

  private formatMeta(meta: Record<string, any> = {}): Record<string, any> {
    return {
      ...meta,
      service: this.service,
      component: 'event-handler',
      environment: process.env['NODE_ENV'] || 'development',
      timestamp: new Date().toISOString()
    };
  }

  debug(meta: Record<string, any>, message: string): void {
    console.debug(`[DEBUG] [${this.service}] ${message}`, this.formatMeta(meta));
  }

  info(meta: Record<string, any>, message: string): void {
    console.log(`[INFO] [${this.service}] ${message}`, this.formatMeta(meta));
  }

  warn(meta: Record<string, any>, message: string): void {
    console.warn(`[WARN] [${this.service}] ${message}`, this.formatMeta(meta));
  }

  error(meta: Record<string, any>, message: string): void {
    console.error(`[ERROR] [${this.service}] ${message}`, this.formatMeta(meta));
  }

  fatal(meta: Record<string, any>, message: string): void {
    console.error(`[FATAL] [${this.service}] ${message}`, this.formatMeta(meta));
  }
}

// Create a singleton logger instance
export const logger = new EventHandlerLogger(); 