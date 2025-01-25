const pino = require('pino');

const createLogger = (name, customTransports = []) => {
  const streams = [
    { stream: process.stdout },
    ...customTransports
  ];

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
      service: 'event-handler',
      env: process.env.NODE_ENV,
    },
  }, pino.multistream(streams));
};

module.exports = { createLogger }; 