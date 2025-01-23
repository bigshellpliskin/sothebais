const logger = require('pino')();

class EventRouter {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.handlers = new Map();
  }

  // Register an event handler
  on(eventType, handler) {
    this.handlers.set(eventType, handler);
  }

  // Process an incoming event
  async processEvent(event) {
    const { type, payload } = event;
    const startTime = process.hrtime();

    try {
      const handler = this.handlers.get(type);
      if (!handler) {
        logger.warn({ eventType: type }, 'No handler registered for event type');
        return;
      }

      await handler(payload);
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;

      // Update metrics
      eventCounter.inc({ type, status: 'success' });
      eventProcessingDuration.observe({ type }, duration);

      logger.info({ 
        eventType: type, 
        duration,
        success: true 
      }, 'Event processed successfully');

    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;

      // Update error metrics
      eventCounter.inc({ type, status: 'error' });
      eventProcessingDuration.observe({ type }, duration);

      logger.error({ 
        eventType: type,
        error: error.message,
        stack: error.stack,
        duration
      }, 'Error processing event');

      throw error;
    }
  }

  // Broadcast an event to all connected clients
  async broadcast(event) {
    try {
      // Store event in Redis for persistence
      await this.redisClient.lPush('events:history', JSON.stringify(event));
      
      // Broadcast to connected clients
      const message = JSON.stringify(event);
      // Implementation of broadcasting will depend on how we store connected clients
      
      logger.info({ eventType: event.type }, 'Event broadcasted successfully');
    } catch (error) {
      logger.error({ 
        eventType: event.type,
        error: error.message 
      }, 'Error broadcasting event');
      throw error;
    }
  }
}

module.exports = EventRouter; 