import { createLogger } from './logger.js';
import { v4 as uuidv4 } from 'uuid';
import { 
  EVENT_TYPES, EVENT_SOURCES
} from '../types/events.js';
import type { 
  Event, EventType, EventSource, BaseEvent, EventTypeKey
} from '../types/events.js';

const logger = createLogger('EventValidation');

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates an event against its expected schema
 * @param event The event to validate
 * @returns true if valid, an array of validation errors if invalid
 */
export function validateEvent(event: any): true | ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if event is an object
  if (!event || typeof event !== 'object') {
    errors.push({ field: 'event', message: 'Event must be an object' });
    return errors;
  }

  // Validate required base fields
  if (!event.id || typeof event.id !== 'string') {
    errors.push({ field: 'id', message: 'Event ID is required and must be a string' });
  }

  if (!event.timestamp || typeof event.timestamp !== 'number') {
    errors.push({ field: 'timestamp', message: 'Event timestamp is required and must be a number' });
  }

  if (!event.type || typeof event.type !== 'string') {
    errors.push({ field: 'type', message: 'Event type is required and must be a string' });
  } else {
    // Validate event type against known types
    const validTypes = Object.values(EVENT_TYPES);
    if (!validTypes.includes(event.type)) {
      errors.push({ field: 'type', message: `Invalid event type: ${event.type}` });
    }
  }

  if (!event.source || typeof event.source !== 'string') {
    errors.push({ field: 'source', message: 'Event source is required and must be a string' });
  } else {
    // Validate source against known sources
    const validSources = Object.values(EVENT_SOURCES);
    if (!validSources.includes(event.source)) {
      errors.push({ field: 'source', message: `Invalid event source: ${event.source}` });
    }
  }

  if (!event.version || typeof event.version !== 'string') {
    errors.push({ field: 'version', message: 'Event version is required and must be a string' });
  }

  // Check for data field
  if (!event.data || typeof event.data !== 'object') {
    errors.push({ field: 'data', message: 'Event data is required and must be an object' });
    return errors; // Stop here if no data to validate
  }

  // Validate based on event type
  const specificErrors = validateEventTypeData(event.type, event.data);
  errors.push(...specificErrors);

  return errors.length === 0 ? true : errors;
}

/**
 * Validates event data based on the event type
 */
function validateEventTypeData(type: string, data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Based on event type, validate the data structure
  switch (type) {
    case EVENT_TYPES.SESSION_START:
      if (!data.sessionId) errors.push({ field: 'data.sessionId', message: 'Session ID is required' });
      if (!data.campaignId) errors.push({ field: 'data.campaignId', message: 'Campaign ID is required' });
      if (!data.sessionDate) errors.push({ field: 'data.sessionDate', message: 'Session date is required' });
      break;

    case EVENT_TYPES.BID_PLACED:
      if (!data.bidId) errors.push({ field: 'data.bidId', message: 'Bid ID is required' });
      if (!data.lotId) errors.push({ field: 'data.lotId', message: 'Lot ID is required' });
      if (!data.sessionId) errors.push({ field: 'data.sessionId', message: 'Session ID is required' });
      if (!data.userId) errors.push({ field: 'data.userId', message: 'User ID is required' });
      if (!data.amount) errors.push({ field: 'data.amount', message: 'Bid amount is required' });
      if (!data.currency) errors.push({ field: 'data.currency', message: 'Currency is required' });
      break;

    case EVENT_TYPES.AUCTION_START:
      if (!data.auctionId) errors.push({ field: 'data.auctionId', message: 'Auction ID is required' });
      if (!data.artItemId) errors.push({ field: 'data.artItemId', message: 'Art item ID is required' });
      if (!data.startTime) errors.push({ field: 'data.startTime', message: 'Start time is required' });
      if (!data.endTime) errors.push({ field: 'data.endTime', message: 'End time is required' });
      if (!data.currency) errors.push({ field: 'data.currency', message: 'Currency is required' });
      break;

    case EVENT_TYPES.STREAM_START:
      if (!data.streamId) errors.push({ field: 'data.streamId', message: 'Stream ID is required' });
      if (!data.startTime) errors.push({ field: 'data.startTime', message: 'Start time is required' });
      if (!data.platform) errors.push({ field: 'data.platform', message: 'Platform is required' });
      break;

    // Add more validation for other event types as needed
  }

  return errors;
}

/**
 * Express middleware to validate events
 */
export function eventValidationMiddleware() {
  return (req: any, res: any, next: any) => {
    const event = req.body;
    const validationResult = validateEvent(event);

    if (validationResult === true) {
      next();
    } else {
      logger.warn('Event validation failed', { errors: validationResult });
      res.status(400).json({ 
        error: 'Invalid event', 
        details: validationResult 
      });
    }
  };
}

/**
 * Create a valid event object from scratch
 * @param type The event type
 * @param source The source service
 * @param data The event data
 * @returns A complete and valid event object
 */
export function createEvent<T extends EventTypeKey>(
  type: T,
  source: EventSource,
  data: any
): Event {
  const baseEvent: BaseEvent = {
    id: uuidv4(),
    timestamp: Date.now(),
    type: EVENT_TYPES[type],
    source,
    version: '1.0.0'
  };

  return {
    ...baseEvent,
    data
  } as Event;
}

/**
 * Dead letter queue handler for events that fail to process
 */
export class DeadLetterQueue {
  private key: string = 'events:deadletter';
  private redis: any;

  constructor(redisClient: any) {
    this.redis = redisClient;
  }

  /**
   * Store a failed event in the dead letter queue
   */
  public async storeFailedEvent(event: Event, error: Error): Promise<void> {
    try {
      const failedEvent = {
        event,
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      };

      await this.redis.lPush(this.key, JSON.stringify(failedEvent));
      logger.info('Event stored in dead letter queue', { eventId: event.id, type: event.type });
    } catch (err) {
      logger.error('Failed to store event in dead letter queue', { err, eventId: event.id });
    }
  }

  /**
   * Get failed events from the dead letter queue
   */
  public async getFailedEvents(limit: number = 100): Promise<any[]> {
    try {
      const results = await this.redis.lRange(this.key, 0, limit - 1);
      return results.map((item: string) => JSON.parse(item));
    } catch (err) {
      logger.error('Failed to get events from dead letter queue', { err });
      return [];
    }
  }

  /**
   * Retry a failed event
   */
  public async retryEvent(eventId: string, eventClient: any): Promise<boolean> {
    try {
      const failedEvents = await this.getFailedEvents();
      const failedEventIndex = failedEvents.findIndex(item => item.event.id === eventId);

      if (failedEventIndex === -1) {
        logger.warn('Failed event not found in dead letter queue', { eventId });
        return false;
      }

      const failedEvent = failedEvents[failedEventIndex];
      const event = failedEvent.event;
      
      // Use the event client to republish the event
      const eventType = Object.keys(EVENT_TYPES).find(
        key => EVENT_TYPES[key as EventTypeKey] === event.type
      ) as EventTypeKey;
      
      if (!eventType) {
        logger.error('Could not determine event type key', { eventId, type: event.type });
        return false;
      }
      
      await eventClient.publish(eventType, event.data);
      
      // Remove from dead letter queue
      await this.redis.lRem(this.key, 1, JSON.stringify(failedEvent));
      logger.info('Event successfully retried and removed from dead letter queue', { eventId, type: event.type });
      
      return true;
    } catch (err) {
      logger.error('Failed to retry event', { err, eventId });
      return false;
    }
  }
} 