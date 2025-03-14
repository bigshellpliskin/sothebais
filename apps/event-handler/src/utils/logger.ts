// Using dynamic import for pino (ES modules compatible)
import * as pinoModule from 'pino';
const { default: pino } = pinoModule as any;

interface CustomTransport {
  stream: any;
}

export const createLogger = (name: string, customTransports: CustomTransport[] = []) => {
  const streams = [
    { stream: process.stdout },
    ...customTransports
  ];

  // Create the logger
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions ? pino.stdTimeFunctions.isoTime : undefined,
    formatters: {
      level: (label: string) => {
        return { level: label };
      },
    },
    base: {
      service: 'event-handler',
      env: process.env.NODE_ENV,
    },
  }, pino.multistream(streams));
}; 