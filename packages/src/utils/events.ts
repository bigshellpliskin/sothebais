import { createClient, type RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from './logger.js';
import { EVENT_TYPES, EVENT_SOURCES } from '../types/events.js';
import type { BaseEvent, Event, EventTypeKey, EventType, EventSource, EventSourceKey } from '../types/events.js';

const logger = createLogger('EventClient');

interface EventClientOptions {
  redisUrl: string;
  serviceName: EventSourceKey;
  eventHistoryMaxItems?: number;
}

export class EventClient {
  private redis: RedisClientType;
  private pubClient: RedisClientType;
  private subClient: RedisClientType;
  private serviceName: EventSource;
  private connected: boolean = false;
  private eventHistoryMaxItems: number;
  private subscribers: Map<EventType, Set<(event: Event) => Promise<void>>> = new Map();

  constructor(options: EventClientOptions) {
    this.redis = createClient({ url: options.redisUrl });
    this.pubClient = this.redis.duplicate();
    this.subClient = this.redis.duplicate();
    this.serviceName = EVENT_SOURCES[options.serviceName];
    this.eventHistoryMaxItems = options.eventHistoryMaxItems || 1000;
    
    // Setup connection event handlers
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers(): void {
    // Setup handlers for main Redis client
    this.redis.on('error', (err) => logger.error('Redis client error', { err }));
    this.redis.on('connect', () => logger.info('Redis client connected'));
    this.redis.on('reconnecting', () => logger.warn('Redis client reconnecting'));
    
    // Setup handlers for publisher client
    this.pubClient.on('error', (err) => logger.error('Redis publisher error', { err }));
    this.pubClient.on('connect', () => logger.info('Redis publisher connected'));
    
    // Setup handlers for subscriber client
    this.subClient.on('error', (err) => logger.error('Redis subscriber error', { err }));
    this.subClient.on('connect', () => logger.info('Redis subscriber connected'));
    this.subClient.on('message', this.handleMessage.bind(this));
  }

  /**
   * Initialize and connect the Redis clients
   */
  public async connect(): Promise<void> {
    if (this.connected) return;
    
    try {
      await this.redis.connect();
      await this.pubClient.connect();
      await this.subClient.connect();
      this.connected = true;
      logger.info('Event client connected to Redis');
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  /**
   * Get the Redis client instance
   * Useful for services that need direct access to Redis
   */
  public getRedisClient(): RedisClientType {
    return this.redis;
  }

  /**
   * Disconnect the Redis clients
   */
  public async disconnect(): Promise<void> {
    if (!this.connected) return;
    
    try {
      await this.pubClient.disconnect();
      await this.subClient.disconnect();
      await this.redis.disconnect();
      this.connected = false;
      logger.info('Event client disconnected from Redis');
    } catch (error) {
      logger.error('Error disconnecting from Redis', { error });
      throw error;
    }
  }

  /**
   * Creates a base event with common fields
   */
  private createBaseEvent(type: EventType): BaseEvent {
    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      source: this.serviceName,
      version: '1.0.0'
    };
  }

  /**
   * Publish an event to the specified channel
   */
  public async publish<T extends Event>(
    eventType: EventTypeKey, 
    data: T['data']
  ): Promise<string> {
    if (!this.connected) {
      throw new Error('Cannot publish event: Redis client not connected');
    }

    const type = EVENT_TYPES[eventType];
    const baseEvent = this.createBaseEvent(type);
    const event = { ...baseEvent, data } as T;
    const eventId = event.id;
    
    try {
      const eventString = JSON.stringify(event);
      const channel = `events:${type}`;
      
      // Publish to the event-specific channel
      await this.pubClient.publish(channel, eventString);
      
      // Publish to the all-events channel
      await this.pubClient.publish('events:all', eventString);
      
      // Store in the event history
      await this.storeEventHistory(event);
      
      logger.info('Event published successfully', { eventId, type });
      return eventId;
    } catch (error) {
      logger.error('Failed to publish event', { error, eventId, type });
      throw error;
    }
  }

  /**
   * Store the event in the history list, with length limit
   */
  private async storeEventHistory<T extends Event>(event: T): Promise<void> {
    try {
      const key = `events:history:${event.type}`;
      const eventString = JSON.stringify(event);
      
      // Add to the specific event type history
      await this.redis.lPush(key, eventString);
      await this.redis.lTrim(key, 0, this.eventHistoryMaxItems - 1);
      
      // Add to the all events history
      await this.redis.lPush('events:history:all', eventString);
      await this.redis.lTrim('events:history:all', 0, this.eventHistoryMaxItems - 1);
    } catch (error) {
      logger.error('Failed to store event in history', { error, eventId: event.id, type: event.type });
    }
  }

  /**
   * Subscribe to events of a specific type
   */
  public async subscribe(
    eventType: EventType,
    handler: (event: Event) => Promise<void>
  ): Promise<void> {
    if (!this.connected) {
      throw new Error('Cannot subscribe: Redis client not connected');
    }

    try {
      const channel = `events:${eventType}`;
      
      // Register the handler for this event type
      if (!this.subscribers.has(eventType)) {
        this.subscribers.set(eventType, new Set());
        // Subscribe to Redis channel if this is the first handler
        await this.subClient.subscribe(channel, this.handleMessage.bind(this));
        logger.info('Subscribed to event channel', { eventType, channel });
      }
      
      // Add this handler to the set of handlers for this event type
      this.subscribers.get(eventType)?.add(handler);
      logger.info('Event handler registered', { eventType });
    } catch (error) {
      logger.error('Failed to subscribe to event', { error, eventType });
      throw error;
    }
  }

  /**
   * Subscribe to all events
   */
  public async subscribeAll(
    handler: (event: Event) => Promise<void>
  ): Promise<void> {
    if (!this.connected) {
      throw new Error('Cannot subscribe: Redis client not connected');
    }

    try {
      const channel = 'events:all';
      
      // Register handler for all events
      if (!this.subscribers.has('all' as EventType)) {
        this.subscribers.set('all' as EventType, new Set());
        // Subscribe to all events channel
        await this.subClient.subscribe(channel, this.handleMessage.bind(this));
        logger.info('Subscribed to all events channel', { channel });
      }
      
      // Add this handler to the set of handlers for all events
      this.subscribers.get('all' as EventType)?.add(handler);
      logger.info('All events handler registered');
    } catch (error) {
      logger.error('Failed to subscribe to all events', { error });
      throw error;
    }
  }

  /**
   * Unsubscribe a handler from a specific event type
   */
  public async unsubscribe(
    eventType: EventType,
    handler: (event: Event) => Promise<void>
  ): Promise<void> {
    if (!this.connected) {
      throw new Error('Cannot unsubscribe: Redis client not connected');
    }

    const handlers = this.subscribers.get(eventType);
    if (!handlers) {
      logger.warn('No handlers registered for this event type', { eventType });
      return;
    }

    // Remove the handler
    handlers.delete(handler);
    
    // If no more handlers for this event type, unsubscribe from Redis channel
    if (handlers.size === 0) {
      try {
        const channel = `events:${eventType}`;
        await this.subClient.unsubscribe(channel);
        this.subscribers.delete(eventType);
        logger.info('Unsubscribed from event channel', { eventType, channel });
      } catch (error) {
        logger.error('Failed to unsubscribe from event', { error, eventType });
        throw error;
      }
    }
  }

  /**
   * Handle incoming Redis messages
   */
  private async handleMessage(message: string, channel: string): Promise<void> {
    try {
      const event = JSON.parse(message) as Event;
      const eventType = event.type;
      
      // Get handlers for this specific event type
      const typeHandlers = this.subscribers.get(eventType);
      
      // Get handlers for all events
      const allHandlers = this.subscribers.get('all' as EventType);
      
      // Call all handlers for this event type
      if (typeHandlers && typeHandlers.size > 0) {
        await Promise.all(
          Array.from(typeHandlers).map((handler) => 
            handler(event).catch((error) => {
              logger.error('Error in event handler', { error, eventId: event.id, type: eventType });
            })
          )
        );
      }
      
      // Call all handlers for all events
      if (allHandlers && allHandlers.size > 0) {
        await Promise.all(
          Array.from(allHandlers).map((handler) => 
            handler(event).catch((error) => {
              logger.error('Error in all-events handler', { error, eventId: event.id, type: eventType });
            })
          )
        );
      }
    } catch (error) {
      logger.error('Error handling Redis message', { error, message, channel });
    }
  }

  /**
   * Get events from history
   */
  public async getEventHistory(
    eventType?: EventType,
    limit: number = 100
  ): Promise<Event[]> {
    if (!this.connected) {
      throw new Error('Cannot get event history: Redis client not connected');
    }

    try {
      const key = eventType ? `events:history:${eventType}` : 'events:history:all';
      const results = await this.redis.lRange(key, 0, limit - 1);
      
      return results.map((item) => JSON.parse(item)) as Event[];
    } catch (error) {
      logger.error('Failed to get event history', { error, eventType, limit });
      throw error;
    }
  }

  /**
   * Replay an event by ID
   */
  public async replayEvent(eventId: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Cannot replay event: Redis client not connected');
    }

    try {
      // Find the event in the history
      const allEvents = await this.redis.lRange('events:history:all', 0, -1);
      const eventToReplay = allEvents.find((eventString) => {
        const parsed = JSON.parse(eventString);
        return parsed.id === eventId;
      });
      
      if (!eventToReplay) {
        logger.warn('Event not found for replay', { eventId });
        return false;
      }
      
      const event = JSON.parse(eventToReplay) as Event;
      const channel = `events:${event.type}`;
      
      // Publish the event again
      await this.pubClient.publish(channel, eventToReplay);
      await this.pubClient.publish('events:all', eventToReplay);
      
      logger.info('Event replayed successfully', { eventId, type: event.type });
      return true;
    } catch (error) {
      logger.error('Failed to replay event', { error, eventId });
      throw error;
    }
  }
} 