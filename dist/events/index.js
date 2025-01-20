"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = exports.localEventEmitter = exports.EventBus = exports.EventPriority = exports.EventType = void 0;
exports.createEvent = createEvent;
exports.emitEvent = emitEvent;
exports.subscribeToLocalEvents = subscribeToLocalEvents;
exports.subscribeToPersistentEvents = subscribeToPersistentEvents;
exports.subscribeToAllEvents = subscribeToAllEvents;
exports.subscribeToStateChanges = subscribeToStateChanges;
const EventBus_1 = require("../infrastructure/events/EventBus");
Object.defineProperty(exports, "EventType", { enumerable: true, get: function () { return EventBus_1.EventType; } });
Object.defineProperty(exports, "EventPriority", { enumerable: true, get: function () { return EventBus_1.EventPriority; } });
Object.defineProperty(exports, "EventBus", { enumerable: true, get: function () { return EventBus_1.EventBus; } });
const eventBusInstance_1 = require("../infrastructure/events/eventBusInstance");
const LocalEventEmitter_1 = require("./LocalEventEmitter");
Object.defineProperty(exports, "localEventEmitter", { enumerable: true, get: function () { return LocalEventEmitter_1.localEventEmitter; } });
const types_1 = require("../state/types");
// Get the runtime instance (this should be passed in or available globally)
const eventBus = (0, eventBusInstance_1.createEventBus)(global.runtime);
exports.eventBus = eventBus;
// Utility function to create an event
function createEvent(type, data, source, priority = EventBus_1.EventPriority.MEDIUM) {
    return {
        type,
        data,
        timestamp: Date.now(),
        source
    };
}
// Emit to both local and persistent event systems
async function emitEvent(type, data, source, priority = EventBus_1.EventPriority.MEDIUM) {
    const event = createEvent(type, data, source);
    try {
        // Emit locally first (synchronous, in-memory)
        await LocalEventEmitter_1.localEventEmitter.emit(event);
        // Then persist to event bus (async, database)
        return await eventBus.emit(type, data, { source, priority });
    }
    catch (error) {
        console.error(`Error emitting event ${type}:`, error);
        // Emit error event
        const errorEvent = createEvent(EventBus_1.EventType.SYSTEM_ERROR, { originalEvent: { type, data }, error }, 'EventSystem');
        await LocalEventEmitter_1.localEventEmitter.emit(errorEvent);
        await eventBus.emit(EventBus_1.EventType.SYSTEM_ERROR, { originalEvent: { type, data }, error }, {
            source: 'EventSystem',
            priority: EventBus_1.EventPriority.HIGH
        });
        throw error;
    }
}
// Subscribe to local events only (in-memory, component communication)
function subscribeToLocalEvents(events, callback) {
    const unsubscribers = events.map(type => LocalEventEmitter_1.localEventEmitter.subscribe(type, callback));
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}
// Subscribe to persistent events (database-backed events)
function subscribeToPersistentEvents(events, callback) {
    events.forEach(type => eventBus.on(type, callback));
    return () => events.forEach(type => eventBus.off(type, callback));
}
// Subscribe to both local and persistent events
function subscribeToAllEvents(events, callback) {
    const localUnsubscribe = subscribeToLocalEvents(events, async (localEvent) => {
        // Convert LocalEvent to PersistentEvent format
        await callback({
            id: localEvent.source + '-' + localEvent.timestamp,
            type: localEvent.type,
            data: localEvent.data,
            metadata: { source: localEvent.source, priority: EventBus_1.EventPriority.MEDIUM },
            timestamp: new Date(localEvent.timestamp)
        });
    });
    const persistentUnsubscribe = subscribeToPersistentEvents(events, callback);
    return () => {
        localUnsubscribe();
        persistentUnsubscribe();
    };
}
// Utility function to subscribe to state changes
function subscribeToStateChanges(key, callback) {
    return types_1.stateManager.subscribe(state => callback(state[key]));
}
