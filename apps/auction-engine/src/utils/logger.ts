import pino from 'pino';

export const createLogger = (name: string) => {
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}; 