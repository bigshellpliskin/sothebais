import { 
    EventType, 
    EventPriority,
    EventMetadata,
    EventBus as EventBusClass,
    EventCallback,
    Event as PersistentEvent
} from '../infrastructure/events/EventBus';
import { createEventBus } from '../infrastructure/events/eventBusInstance';
import { localEventEmitter, LocalEvent } from './LocalEventEmitter';
import { stateManager, SystemState } from '../state/types';
import { IAgentRuntime } from "@elizaos/core";

declare global {
    var runtime: IAgentRuntime;
}

// Get the runtime instance (this should be passed in or available globally)
const eventBus = createEventBus(global.runtime);

// Utility function to create an event
export function createEvent(
    type: EventType,
    data: any,
    source: string,
    priority: EventPriority = EventPriority.MEDIUM
): LocalEvent {
    return {
        type,
        data,
        timestamp: Date.now(),
        source
    };
}

// Emit to both local and persistent event systems
export async function emitEvent(
    type: EventType,
    data: any,
    source: string,
    priority: EventPriority = EventPriority.MEDIUM
): Promise<string> {
    const event = createEvent(type, data, source);
    
    try {
        // Emit locally first (synchronous, in-memory)
        await localEventEmitter.emit(event);
        
        // Then persist to event bus (async, database)
        return await eventBus.emit(type, data, { source, priority });
    } catch (error) {
        console.error(`Error emitting event ${type}:`, error);
        // Emit error event
        const errorEvent = createEvent(EventType.SYSTEM_ERROR, { originalEvent: { type, data }, error }, 'EventSystem');
        await localEventEmitter.emit(errorEvent);
        await eventBus.emit(EventType.SYSTEM_ERROR, { originalEvent: { type, data }, error }, { 
            source: 'EventSystem', 
            priority: EventPriority.HIGH 
        });
        throw error;
    }
}

// Subscribe to local events only (in-memory, component communication)
export function subscribeToLocalEvents(
    events: EventType[],
    callback: (event: LocalEvent) => Promise<void>
): () => void {
    const unsubscribers = events.map(type => localEventEmitter.subscribe(type, callback));
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

// Subscribe to persistent events (database-backed events)
export function subscribeToPersistentEvents(
    events: EventType[],
    callback: EventCallback
): () => void {
    events.forEach(type => eventBus.on(type, callback));
    return () => events.forEach(type => eventBus.off(type, callback));
}

// Subscribe to both local and persistent events
export function subscribeToAllEvents(
    events: EventType[],
    callback: (event: PersistentEvent) => Promise<void>
): () => void {
    const localUnsubscribe = subscribeToLocalEvents(events, async (localEvent) => {
        // Convert LocalEvent to PersistentEvent format
        await callback({
            id: localEvent.source + '-' + localEvent.timestamp,
            type: localEvent.type,
            data: localEvent.data,
            metadata: { source: localEvent.source, priority: EventPriority.MEDIUM },
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
export function subscribeToStateChanges<K extends keyof SystemState>(
    key: K,
    callback: (value: SystemState[K]) => void
): () => void {
    return stateManager.subscribe(state => callback(state[key]));
}

export {
    EventType,
    EventPriority,
    LocalEvent as Event,
    EventBusClass as EventBus,
    localEventEmitter,
    eventBus
}; 