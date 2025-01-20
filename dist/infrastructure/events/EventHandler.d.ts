import { DatabaseAdapter } from '../database/DatabaseAdapter';
export declare enum EventType {
    AUCTION_CREATED = "auction:created",
    AUCTION_STARTED = "auction:started",
    AUCTION_ENDED = "auction:ended",
    AUCTION_CANCELLED = "auction:cancelled",
    BID_PLACED = "bid:placed",
    BID_ACCEPTED = "bid:accepted",
    BID_REJECTED = "bid:rejected",
    NEW_HIGHEST_BID = "bid:newHighest",
    VTUBER_EXPRESSION_CHANGE = "vtuber:expressionChange",
    VTUBER_ANIMATION_START = "vtuber:animationStart",
    VTUBER_ANIMATION_END = "vtuber:animationEnd",
    STREAM_STARTED = "stream:started",
    STREAM_ENDED = "stream:ended",
    STREAM_ERROR = "stream:error",
    SYSTEM_ERROR = "system:error",
    SYSTEM_WARNING = "system:warning",
    SYSTEM_INFO = "system:info"
}
export declare enum EventPriority {
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
    retryDelay?: number;
    processingInterval?: number;
    maxConcurrent?: number;
}
export declare class EventBus {
    private listeners;
    private db;
    private config;
    private processingQueue;
    private processingInterval?;
    constructor(db: DatabaseAdapter, config?: EventBusConfig);
    initialize(): Promise<void>;
    private startProcessingLoop;
    shutdown(): Promise<void>;
    on(eventType: EventType, callback: EventCallback): void;
    off(eventType: EventType, callback: EventCallback): void;
    emit(type: EventType, data: any, metadata?: Partial<EventMetadata>): Promise<string>;
    private processEvent;
    private processEvents;
    getEventHistory(options?: {
        type?: EventType;
        from?: Date;
        to?: Date;
        processed?: boolean;
        priority?: EventPriority;
        limit?: number;
    }): Promise<Event[]>;
}
export declare const eventBus: EventBus;
