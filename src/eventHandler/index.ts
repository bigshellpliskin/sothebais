import { 
    EventType,
    EventPriority,
    EventMetadata,
    EventBus,
    Event as BusEvent
} from '../infrastructure/events/EventBus';
import { eventBus } from '../infrastructure/events/EventHandler';
import { localEventEmitter, LocalEvent } from '../events/LocalEventEmitter';
import { stateManager, SystemState } from '../state/types';

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
    callback: (event: BusEvent) => Promise<void>
): () => void {
    const unsubscribers = events.map(type => {
        eventBus.on(type, callback);
        return () => eventBus.off(type, callback);
    });
    return () => unsubscribers.forEach(unsub => unsub());
}

// Subscribe to both local and persistent events
export function subscribeToAllEvents(
    events: EventType[],
    callback: (event: LocalEvent | BusEvent) => Promise<void>
): () => void {
    const localUnsubscribe = subscribeToLocalEvents(events, callback as (event: LocalEvent) => Promise<void>);
    const persistentUnsubscribe = subscribeToPersistentEvents(events, callback as (event: BusEvent) => Promise<void>);
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

export const eventHandler = {
    createEvent,
    emitEvent,
    subscribeToLocalEvents,
    subscribeToPersistentEvents,
    subscribeToAllEvents,
    subscribeToStateChanges
};

export {
    EventPriority,
    LocalEvent,
    BusEvent,
    EventBus,
    localEventEmitter
}; 