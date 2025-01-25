const pino = require('pino');

const createLogger = (name) => {
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    base: {
      service: 'stream-manager',
      env: process.env.NODE_ENV,
    },
  });
};

module.exports = { createLogger }; 