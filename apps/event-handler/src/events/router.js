const { createLogger } = require('../utils/logger');
const logger = createLogger('event-router');

class EventRouter {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.handlers = new Map();
  }

  // Register an event handler
  on(eventType, handler) {
    this.handlers.set(eventType, handler);
    logger.info({ eventType }, 'Event handler registered');
  }

  // Process an incoming event
  async processEvent(event) {
    const { type, payload, source } = event;
    const startTime = process.hrtime();
    const eventContext = {
      eventId: event.id || Date.now().toString(),
      eventType: type,
      source: source || 'unknown',
      payloadSize: JSON.stringify(payload).length,
    };

    try {
      const handler = this.handlers.get(type);
      if (!handler) {
        logger.warn({ ...eventContext }, 'No handler registered for event type');
        return;
      }

      logger.info({ ...eventContext, state: 'processing' }, 'Processing event');
      await handler(payload);
      
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;

      // Update metrics
      eventCounter.inc({ type, status: 'success' });
      eventProcessingDuration.observe({ type }, duration);

      logger.info({ 
        ...eventContext,
        duration,
        success: true,
        state: 'completed'
      }, 'Event processed successfully');

    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;

      // Update error metrics
      eventCounter.inc({ type, status: 'error' });
      eventProcessingDuration.observe({ type }, duration);

      logger.error({ 
        ...eventContext,
        error: error.message,
        stack: error.stack,
        duration,
        state: 'failed'
      }, 'Error processing event');

      throw error;
    }
  }

  // Broadcast an event to all connected clients
  async broadcast(event) {
    const eventContext = {
      eventId: event.id || Date.now().toString(),
      eventType: event.type,
      source: event.source || 'unknown'
    };

    try {
      // Store event in Redis for persistence
      await this.redisClient.lPush('events:history', JSON.stringify(event));
      
      // Broadcast to connected clients
      const message = JSON.stringify(event);
      // Implementation of broadcasting will depend on how we store connected clients
      
      logger.info({ 
        ...eventContext,
        state: 'broadcasted'
      }, 'Event broadcasted successfully');
    } catch (error) {
      logger.error({ 
        ...eventContext,
        error: error.message,
        state: 'broadcast_failed'
      }, 'Error broadcasting event');
      throw error;
    }
  }
}

module.exports = EventRouter; 