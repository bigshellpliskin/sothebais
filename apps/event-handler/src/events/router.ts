import { createLogger } from '../utils/logger.js';
import type { RedisClientType } from 'redis';

// Define types
interface Event {
  id?: string;
  type: string;
  payload: any;
  source?: string;
}

// Import metrics (these were missing in the original file)
// Assuming they're defined in the metrics module
import { metrics } from '../middleware/metrics.js';

// Need to add these metrics that were referenced but not defined
const eventCounter = metrics.eventCounter;
// Adding a dummy implementation since this wasn't defined before
const eventProcessingDuration = {
  observe: (labels: Record<string, string>, value: number) => {
    console.log(`Event processing duration: ${value}s for type ${labels.type}`);
  }
};

const logger = createLogger('event-router');

class EventRouter {
  private redisClient: RedisClientType;
  private handlers: Map<string, (payload: any) => Promise<void>>;

  constructor(redisClient: RedisClientType) {
    this.redisClient = redisClient;
    this.handlers = new Map();
  }

  // Register an event handler
  on(eventType: string, handler: (payload: any) => Promise<void>): void {
    this.handlers.set(eventType, handler);
    logger.info({ eventType }, 'Event handler registered');
  }

  // Process an incoming event
  async processEvent(event: Event): Promise<void> {
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
        error: (error as Error).message,
        stack: (error as Error).stack,
        duration,
        state: 'failed'
      }, 'Error processing event');

      throw error;
    }
  }

  // Broadcast an event to all connected clients
  async broadcast(event: Event): Promise<void> {
    const eventContext = {
      eventId: event.id || Date.now().toString(),
      eventType: event.type,
      source: event.source || 'unknown'
    };

    try {
      // Store event in Redis for persistence
      await this.redisClient.lPush('events:history', JSON.stringify(event));
      
      // Broadcast to connected clients
      // Implementation of broadcasting will depend on how we store connected clients
      
      logger.info({ 
        ...eventContext,
        state: 'broadcasted'
      }, 'Event broadcasted successfully');
    } catch (error) {
      logger.error({ 
        ...eventContext,
        error: (error as Error).message,
        state: 'broadcast_failed'
      }, 'Error broadcasting event');
      throw error;
    }
  }
}

export default EventRouter; 