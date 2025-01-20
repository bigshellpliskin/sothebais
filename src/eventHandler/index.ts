import { 
    EventType, 
    EventPriority,
    EventMetadata,
    EventBus
} from '../infrastructure/events/EventBusInstance';
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
        return await EventBus.emit(type, data, { source, priority });
    } catch (error) {
        console.error(`Error emitting event ${type}:`, error);
        // Emit error event
        const errorEvent = createEvent(EventType.SYSTEM_ERROR, { originalEvent: { type, data }, error }, 'EventSystem');
        await localEventEmitter.emit(errorEvent);
        await EventBus.emit(EventType.SYSTEM_ERROR, { originalEvent: { type, data }, error }, { 
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
    callback: (event: LocalEvent) => Promise<void>
): () => void {
    const unsubscribers = events.map(type => EventBus.on(type, callback));
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

// Subscribe to both local and persistent events
export function subscribeToAllEvents(
    events: EventType[],
    callback: (event: LocalEvent) => Promise<void>
): () => void {
    const localUnsubscribe = subscribeToLocalEvents(events, callback);
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

export const eventHandler = {
    createEvent,
    emitEvent,
    subscribeToLocalEvents,
    subscribeToPersistentEvents,
    subscribeToAllEvents,
    subscribeToStateChanges
};

export {
    EventType,
    EventPriority,
    LocalEvent as Event,
    EventBus,
    localEventEmitter
}; 