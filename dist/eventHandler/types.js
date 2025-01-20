"use strict";
// src/events/LocalEventEmitter.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.localEventEmitter = exports.LocalEventEmitter = void 0;
class LocalEventEmitter {
    constructor() {
        this.MAX_LOG_SIZE = 1000;
        this.subscribers = new Map();
        this.eventLog = [];
    }
    async emit(event) {
        this.logEvent(event);
        const callbacks = this.subscribers.get(event.type) || new Set();
        const promises = Array.from(callbacks).map(callback => {
            try {
                return callback(event);
            }
            catch (error) {
                console.error(`Error executing callback for event ${event.type}:`, error);
                return Promise.reject(error);
            }
        });
        await Promise.allSettled(promises);
    }
    subscribe(type, callback) {
        if (!this.subscribers.has(type)) {
            this.subscribers.set(type, new Set());
        }
        this.subscribers.get(type).add(callback);
        return () => {
            this.subscribers.get(type)?.delete(callback);
        };
    }
    logEvent(event) {
        this.eventLog.push(event);
        if (this.eventLog.length > this.MAX_LOG_SIZE) {
            this.eventLog = this.eventLog.slice(-this.MAX_LOG_SIZE);
        }
    }
    getEventLog() {
        return [...this.eventLog];
    }
    clear() {
        this.subscribers.clear();
        this.eventLog = [];
    }
}
exports.LocalEventEmitter = LocalEventEmitter;
// Export singleton instance
exports.localEventEmitter = new LocalEventEmitter();
