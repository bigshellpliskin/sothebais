import { DatabaseAdapter } from '../database/DatabaseAdapter';
import { randomUUID } from 'crypto';

// Event Types Definition
export enum EventType {
    // Auction Events
    AUCTION_CREATED = 'auction:created',
    AUCTION_STARTED = 'auction:started',
    AUCTION_ENDED = 'auction:ended',
    AUCTION_CANCELLED = 'auction:cancelled',
    
    // Bid Events
    BID_PLACED = 'bid:placed',
    BID_ACCEPTED = 'bid:accepted',
    BID_REJECTED = 'bid:rejected',
    NEW_HIGHEST_BID = 'bid:newHighest',
    
    // VTuber Events
    VTUBER_EXPRESSION_CHANGE = 'vtuber:expressionChange',
    VTUBER_ANIMATION_START = 'vtuber:animationStart',
    VTUBER_ANIMATION_END = 'vtuber:animationEnd',
    
    // Stream Events
    STREAM_STARTED = 'stream:started',
    STREAM_ENDED = 'stream:ended',
    STREAM_ERROR = 'stream:error',
    
    // System Events
    SYSTEM_ERROR = 'system:error',
    SYSTEM_WARNING = 'system:warning',
    SYSTEM_INFO = 'system:info'
}

// Event Priority Levels
export enum EventPriority {
    LOW = 0,
    MEDIUM = 1,
    HIGH = 2,
    CRITICAL = 3
}

export interface EventMetadata {
    source: string;
    priority: EventPriority;
    correlationId?: string;
    groupId?: string;
}

export interface Event {
    id: string;
    type: EventType;
    data: any;
    metadata: EventMetadata;
    timestamp: Date;
    processed?: boolean;
    error?: string;
    retryCount?: number;
}

export type EventCallback = (event: Event) => Promise<void>;

export interface EventBusConfig {
    maxRetries?: number;
    retryDelay?: number; // milliseconds
    processingInterval?: number; // milliseconds
    maxConcurrent?: number;
}

export class EventBus {
    private listeners: Map<EventType, Set<EventCallback>>;
    private db: DatabaseAdapter;
    private config: Required<EventBusConfig>;
    private processingQueue: Set<string>;
    private processingInterval?: NodeJS.Timeout;

    constructor(db: DatabaseAdapter, config: EventBusConfig = {}) {
        this.listeners = new Map();
        this.db = db;
        this.processingQueue = new Set();
        
        // Set default configuration
        this.config = {
            maxRetries: 3,
            retryDelay: 1000,
            processingInterval: 1000,
            maxConcurrent: 10,
            ...config
        };
    }

    async initialize(): Promise<void> {
        // Verify events table exists
        await this.db.execute(`
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                data JSON NOT NULL,
                metadata JSON NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                processed BOOLEAN DEFAULT FALSE,
                error TEXT,
                retryCount INTEGER DEFAULT 0,
                nextRetry DATETIME
            )
        `);

        // Start event processing loop
        this.startProcessingLoop();
    }

    private startProcessingLoop(): void {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }

        this.processingInterval = setInterval(
            () => this.processEvents(),
            this.config.processingInterval
        );
    }

    async shutdown(): Promise<void> {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }
        
        // Wait for current processing to complete
        while (this.processingQueue.size > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    on(eventType: EventType, callback: EventCallback): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType)?.add(callback);
    }

    off(eventType: EventType, callback: EventCallback): void {
        this.listeners.get(eventType)?.delete(callback);
    }

    async emit(type: EventType, data: any, metadata: Partial<EventMetadata> = {}): Promise<string> {
        const event: Event = {
            id: randomUUID(),
            type,
            data,
            metadata: {
                source: metadata.source || 'system',
                priority: metadata.priority || EventPriority.MEDIUM,
                correlationId: metadata.correlationId,
                groupId: metadata.groupId
            },
            timestamp: new Date()
        };

        // Store event in database
        await this.db.insert('events', {
            ...event,
            data: JSON.stringify(event.data),
            metadata: JSON.stringify(event.metadata)
        });

        // Process high priority events immediately
        if (event.metadata.priority >= EventPriority.HIGH) {
            await this.processEvent(event);
        }

        return event.id;
    }

    private async processEvent(event: Event): Promise<void> {
        if (this.processingQueue.has(event.id)) {
            return; // Already being processed
        }

        this.processingQueue.add(event.id);

        try {
            const listeners = this.listeners.get(event.type);
            if (listeners) {
                const promises = Array.from(listeners).map(callback => 
                    callback(event).catch(error => {
                        throw error;
                    })
                );
                await Promise.all(promises);
            }

            // Mark as processed
            await this.db.update('events', event.id, {
                processed: true
            });
        } catch (error) {
            const retryCount = (event.retryCount || 0) + 1;
            const shouldRetry = retryCount <= this.config.maxRetries;

            await this.db.update('events', event.id, {
                error: (error as Error).message,
                retryCount,
                nextRetry: shouldRetry ? 
                    new Date(Date.now() + this.config.retryDelay * Math.pow(2, retryCount - 1)) : 
                    null,
                processed: !shouldRetry
            });
        } finally {
            this.processingQueue.delete(event.id);
        }
    }

    private async processEvents(): Promise<void> {
        // Don't process if at max concurrent limit
        if (this.processingQueue.size >= this.config.maxConcurrent) {
            return;
        }

        // Get unprocessed events that are ready for processing/retry
        const events = await this.db.query({
            tableName: 'events',
            filter: {
                processed: false,
                nextRetry: null // or less than current time
            },
            limit: this.config.maxConcurrent - this.processingQueue.size
        });

        // Process events
        await Promise.all(events.map(event => this.processEvent({
            ...event,
            data: JSON.parse(event.data),
            metadata: JSON.parse(event.metadata)
        })));
    }

    async getEventHistory(
        options: {
            type?: EventType;
            from?: Date;
            to?: Date;
            processed?: boolean;
            priority?: EventPriority;
            limit?: number;
        } = {}
    ): Promise<Event[]> {
        const filter: Record<string, any> = {};
        
        if (options.type) filter.type = options.type;
        if (options.processed !== undefined) filter.processed = options.processed;
        if (options.from) filter.timestamp = `>= ${options.from.toISOString()}`;
        if (options.to) filter.timestamp = `<= ${options.to.toISOString()}`;
        if (options.priority !== undefined) filter["json_extract(metadata, '$.priority')"] = options.priority;

        const events = await this.db.query({
            tableName: 'events',
            filter,
            limit: options.limit || 100
        });

        return events.map(event => ({
            ...event,
            timestamp: new Date(event.timestamp)
        }));
    }
}