import type { EventType } from '@sothebais/shared/types/events.js';
import { logger } from '../utils/logger.js';
import type { StreamManagerEvent } from '../types/index.js';

// Define EventListener interface locally
interface EventListener {
  (event: StreamManagerEvent): Promise<void> | void;
}

// Define EventEmitter interface locally
interface EventEmitter {
  on(type: EventType, listener: EventListener): void;
  off(type: EventType, listener: EventListener): void;
  once(type: EventType, listener: EventListener): void;
  emit(event: StreamManagerEvent): Promise<void> | void;
}

export class StreamManagerEventEmitter implements EventEmitter {
  private listeners: Map<EventType, Set<EventListener>>;
  private static instance: StreamManagerEventEmitter | null = null;

  private constructor() {
    this.listeners = new Map();
  }

  public static getInstance(): StreamManagerEventEmitter {
    if (!StreamManagerEventEmitter.instance) {
      StreamManagerEventEmitter.instance = new StreamManagerEventEmitter();
    }
    return StreamManagerEventEmitter.instance;
  }

  public async emit(event: StreamManagerEvent): Promise<void> {
    try {
      const eventListeners = this.listeners.get(event.type);
      if (!eventListeners) return;

      const promises = Array.from(eventListeners).map(async (listener) => {
        try {
          await listener(event);
        } catch (error) {
          logger.error('Error in event listener', {
            error: error instanceof Error ? error.message : 'Unknown error',
            eventType: event.type,
            eventId: event.id
          });
        }
      });

      await Promise.all(promises);
    } catch (error) {
      logger.error('Error emitting event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.type,
        eventId: event.id
      });
    }
  }

  public on(type: EventType, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  public off(type: EventType, listener: EventListener): void {
    const eventListeners = this.listeners.get(type);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  public once(type: EventType, listener: EventListener): void {
    const onceWrapper = async (event: StreamManagerEvent) => {
      try {
        await listener(event);
        this.off(type, onceWrapper);
      } catch (error) {
        logger.error('Error in once event listener', {
          error: error instanceof Error ? error.message : 'Unknown error',
          eventType: type,
          eventId: event.id
        });
        this.off(type, onceWrapper);
      }
    };
    this.on(type, onceWrapper);
  }

  public removeAllListeners(type?: EventType): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
    }
  }

  public listenerCount(type: EventType): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

export const eventEmitter = StreamManagerEventEmitter.getInstance(); 