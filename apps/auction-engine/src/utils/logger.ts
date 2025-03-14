/**
 * Logger utility for the auction engine
 * Provides consistent logging across the application
 */

/**
 * Simple logger interface
 */
export interface Logger {
  info(message: string, ...meta: any[]): void;
  error(message: string, ...meta: any[]): void;
  warn(message: string, ...meta: any[]): void;
  debug(message: string, ...meta: any[]): void;
}

/**
 * Default logger implementation
 * In production, this would be replaced with a more robust solution
 */
class ConsoleLogger implements Logger {
  info(message: string, ...meta: any[]): void {
    console.log(`[INFO] ${message}`, ...meta);
  }

  error(message: string, ...meta: any[]): void {
    console.error(`[ERROR] ${message}`, ...meta);
  }

  warn(message: string, ...meta: any[]): void {
    console.warn(`[WARN] ${message}`, ...meta);
  }

  debug(message: string, ...meta: any[]): void {
    console.debug(`[DEBUG] ${message}`, ...meta);
  }
}

// Export a singleton instance
export const logger: Logger = new ConsoleLogger(); 