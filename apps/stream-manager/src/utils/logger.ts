import pino from 'pino';
import { getConfig } from '../config';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

interface LoggerOptions {
  name?: string;
  level?: LogLevel;
  prettyPrint?: boolean;
}

class Logger {
  private static instance: Logger;
  private logger!: pino.Logger;
  private initialized = false;

  private constructor() {
    // Defer logger creation until initialize is called
  }

  public initialize(config: any): void {
    if (this.initialized) {
      return;
    }

    const isDevEnv = config.NODE_ENV === 'development';

    this.logger = pino({
      name: 'stream-manager',
      level: isDevEnv ? 'debug' : 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label: string) => {
          return { level: label };
        },
      },
      base: {
        service: 'stream-manager',
        env: config.NODE_ENV,
      },
      transport: isDevEnv ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        }
      } : undefined
    });

    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Logger not initialized. Call initialize() first.');
    }
  }

  public static getInstance(options?: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // Update all logging methods to check initialization
  public fatal(obj: object | string, msg?: string): void {
    this.ensureInitialized();
    if (typeof obj === 'string') {
      this.logger.fatal(obj);
    } else {
      this.logger.fatal(obj, msg);
    }
  }

  public error(obj: object | string, msg?: string): void {
    this.ensureInitialized();
    if (typeof obj === 'string') {
      this.logger.error(obj);
    } else {
      this.logger.error(obj, msg);
    }
  }

  public warn(obj: object | string, msg?: string): void {
    this.ensureInitialized();
    if (typeof obj === 'string') {
      this.logger.warn(obj);
    } else {
      this.logger.warn(obj, msg);
    }
  }

  public info(obj: object | string, msg?: string): void {
    this.ensureInitialized();
    if (typeof obj === 'string') {
      this.logger.info(obj);
    } else {
      this.logger.info(obj, msg);
    }
  }

  public debug(obj: object | string, msg?: string): void {
    this.ensureInitialized();
    if (typeof obj === 'string') {
      this.logger.debug(obj);
    } else {
      this.logger.debug(obj, msg);
    }
  }

  public trace(obj: object | string, msg?: string): void {
    this.ensureInitialized();
    if (typeof obj === 'string') {
      this.logger.trace(obj);
    } else {
      this.logger.trace(obj, msg);
    }
  }

  // Specialized logging methods for specific contexts
  public logMetrics(metrics: object): void {
    this.info({ type: 'metrics', ...metrics }, 'Performance metrics update');
  }

  public logLayerEvent(event: string, layerId: string, data?: object): void {
    this.debug(
      { type: 'layer', event, layerId, ...data },
      `Layer event: ${event}`
    );
  }

  public logStreamEvent(event: string, data?: object): void {
    this.info(
      { type: 'stream', event, ...data },
      `Stream event: ${event}`
    );
  }

  public logWebSocketEvent(event: string, clientId?: string, data?: object): void {
    this.debug(
      { type: 'websocket', event, clientId, ...data },
      `WebSocket event: ${event}`
    );
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();

// Export the class for testing or specialized instances
export { Logger }; 
