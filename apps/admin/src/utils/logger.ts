interface LogContext {
  [key: string]: any;
}

class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  info(message: string, context?: LogContext) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      ...context,
      service: 'admin'
    }));
  }

  error(message: string, context?: LogContext) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      ...context,
      service: 'admin'
    }));
  }

  warn(message: string, context?: LogContext) {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      ...context,
      service: 'admin'
    }));
  }

  debug(message: string, context?: LogContext) {
    console.debug(JSON.stringify({
      level: 'debug',
      message,
      ...context,
      service: 'admin'
    }));
  }
}

export const logger = Logger.getInstance(); 