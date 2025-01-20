"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = exports.EventBus = exports.EventPriority = exports.EventType = void 0;
const crypto_1 = require("crypto");
// Event Types Definition
var EventType;
(function (EventType) {
    // Auction Events
    EventType["AUCTION_CREATED"] = "auction:created";
    EventType["AUCTION_STARTED"] = "auction:started";
    EventType["AUCTION_ENDED"] = "auction:ended";
    EventType["AUCTION_CANCELLED"] = "auction:cancelled";
    // Bid Events
    EventType["BID_PLACED"] = "bid:placed";
    EventType["BID_ACCEPTED"] = "bid:accepted";
    EventType["BID_REJECTED"] = "bid:rejected";
    EventType["NEW_HIGHEST_BID"] = "bid:newHighest";
    // VTuber Events
    EventType["VTUBER_EXPRESSION_CHANGE"] = "vtuber:expressionChange";
    EventType["VTUBER_ANIMATION_START"] = "vtuber:animationStart";
    EventType["VTUBER_ANIMATION_END"] = "vtuber:animationEnd";
    // Stream Events
    EventType["STREAM_STARTED"] = "stream:started";
    EventType["STREAM_ENDED"] = "stream:ended";
    EventType["STREAM_ERROR"] = "stream:error";
    // System Events
    EventType["SYSTEM_ERROR"] = "system:error";
    EventType["SYSTEM_WARNING"] = "system:warning";
    EventType["SYSTEM_INFO"] = "system:info";
})(EventType || (exports.EventType = EventType = {}));
// Event Priority Levels
var EventPriority;
(function (EventPriority) {
    EventPriority[EventPriority["LOW"] = 0] = "LOW";
    EventPriority[EventPriority["MEDIUM"] = 1] = "MEDIUM";
    EventPriority[EventPriority["HIGH"] = 2] = "HIGH";
    EventPriority[EventPriority["CRITICAL"] = 3] = "CRITICAL";
})(EventPriority || (exports.EventPriority = EventPriority = {}));
class EventBus {
    constructor(db, config = {}) {
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
    async initialize() {
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
    startProcessingLoop() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }
        this.processingInterval = setInterval(() => this.processEvents(), this.config.processingInterval);
    }
    async shutdown() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }
        // Wait for current processing to complete
        while (this.processingQueue.size > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType)?.add(callback);
    }
    off(eventType, callback) {
        this.listeners.get(eventType)?.delete(callback);
    }
    async emit(type, data, metadata = {}) {
        const event = {
            id: (0, crypto_1.randomUUID)(),
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
    async processEvent(event) {
        if (this.processingQueue.has(event.id)) {
            return; // Already being processed
        }
        this.processingQueue.add(event.id);
        try {
            const listeners = this.listeners.get(event.type);
            if (listeners) {
                const promises = Array.from(listeners).map(callback => callback(event).catch(error => {
                    throw error;
                }));
                await Promise.all(promises);
            }
            // Mark as processed
            await this.db.update('events', event.id, {
                processed: true
            });
        }
        catch (error) {
            const retryCount = (event.retryCount || 0) + 1;
            const shouldRetry = retryCount <= this.config.maxRetries;
            await this.db.update('events', event.id, {
                error: error.message,
                retryCount,
                nextRetry: shouldRetry ?
                    new Date(Date.now() + this.config.retryDelay * Math.pow(2, retryCount - 1)) :
                    null,
                processed: !shouldRetry
            });
        }
        finally {
            this.processingQueue.delete(event.id);
        }
    }
    async processEvents() {
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
    async getEventHistory(options = {}) {
        const filter = {};
        if (options.type)
            filter.type = options.type;
        if (options.processed !== undefined)
            filter.processed = options.processed;
        if (options.from)
            filter.timestamp = `>= ${options.from.toISOString()}`;
        if (options.to)
            filter.timestamp = `<= ${options.to.toISOString()}`;
        if (options.priority !== undefined)
            filter["json_extract(metadata, '$.priority')"] = options.priority;
        const events = await this.db.query({
            tableName: 'events',
            filter,
            limit: options.limit || 100
        });
        return events.map(event => ({
            ...event,
            data: JSON.parse(event.data),
            metadata: JSON.parse(event.metadata)
        }));
    }
}
exports.EventBus = EventBus;
// Export singleton instance
exports.eventBus = new EventBus(db);
