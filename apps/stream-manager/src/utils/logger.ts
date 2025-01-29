import pino from 'pino';
import { getConfig } from '../config';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogContext {
  requestId?: string;
  userId?: string;
  service?: string;
  component?: string;
  [key: string]: any;
}

export interface LoggerOptions {
  name?: string;
  level?: LogLevel;
  prettyPrint?: boolean;
  context?: LogContext;
}

class Logger {
  private static instance: Logger;
  private logger: pino.Logger;
  private initialized = false;
  private context: LogContext = {};
  private metricsLogInterval = 10000; // Log metrics every 10 seconds
  private lastMetricsLog = 0;

  private constructor() {
    this.logger = this.createDefaultLogger();
  }

  private createDefaultLogger(): pino.Logger {
    return pino({
      name: 'stream-manager',
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname,service,env',
          messageFormat: '{msg}',
        }
      }
    });
  }

  public initialize(config: any): void {
    if (this.initialized) {
      return;
    }

    const isDevEnv = config.NODE_ENV === 'development';
    const logLevel = process.env.LOG_LEVEL || (isDevEnv ? 'debug' : 'info');

    this.logger = pino({
      name: 'stream-manager',
      level: logLevel,
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
          ignore: 'pid,hostname,service,env',
          messageFormat: '{msg}',
        }
      } : undefined
    });

    this.initialized = true;
  }

  private ensureLogger(): void {
    if (!this.logger) {
      this.logger = this.createDefaultLogger();
    }
  }

  public static getInstance(options?: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
      if (options?.context) {
        Logger.instance.setContext(options.context);
      }
    }
    return Logger.instance;
  }

  public setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  public clearContext(): void {
    this.context = {};
  }

  public withContext(context: LogContext): Logger {
    const newLogger = Logger.getInstance();
    newLogger.setContext({ ...this.context, ...context });
    return newLogger;
  }

  private formatLogObject(obj: object | string, msg?: string): object {
    if (typeof obj === 'string') {
      return {
        msg: obj,
        context: this.context,
      };
    }
    
    // Filter out sensitive or verbose data
    const filteredObj: Record<string, any> = { ...obj };
    delete filteredObj['config'];
    delete filteredObj['context'];
    
    return {
      ...filteredObj,
      context: this.context,
      msg: msg || '',
    };
  }

  public fatal(obj: object | string, msg?: string, error?: Error): void {
    this.ensureLogger();
    const logObj = this.formatLogObject(obj, msg);
    if (error) {
      this.logger.fatal({ ...logObj, error: this.formatError(error) });
    } else {
      this.logger.fatal(logObj);
    }
  }

  public error(obj: object | string, msg?: string, error?: Error): void {
    this.ensureLogger();
    const logObj = this.formatLogObject(obj, msg);
    if (error) {
      this.logger.error({ ...logObj, error: this.formatError(error) });
    } else {
      this.logger.error(logObj);
    }
  }

  public warn(obj: object | string, msg?: string): void {
    this.ensureLogger();
    this.logger.warn(this.formatLogObject(obj, msg));
  }

  public info(obj: object | string, msg?: string): void {
    this.ensureLogger();
    this.logger.info(this.formatLogObject(obj, msg));
  }

  public debug(obj: object | string, msg?: string): void {
    this.ensureLogger();
    this.logger.debug(this.formatLogObject(obj, msg));
  }

  public trace(obj: object | string, msg?: string): void {
    this.ensureLogger();
    this.logger.trace(this.formatLogObject(obj, msg));
  }

  private formatError(error: Error): object {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  // Specialized logging methods for specific contexts
  public logMetrics(metrics: object): void {
    const now = Date.now();
    if (now - this.lastMetricsLog >= this.metricsLogInterval) {
      this.info(
        { type: 'metrics', ...metrics },
        'Performance metrics update'
      );
      this.lastMetricsLog = now;
    }
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

  public logHttpRequest(req: any, res: any, responseTime: number): void {
    this.debug({
      type: 'http',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      responseTime,
    }, `${req.method} ${req.url}`);
  }

  public startTimer(): () => number {
    const start = process.hrtime();
    return () => {
      const [seconds, nanoseconds] = process.hrtime(start);
      return seconds * 1000 + nanoseconds / 1000000;
    };
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();

// Export the class for testing or specialized instances
export { Logger }; 
