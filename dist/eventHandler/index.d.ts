import { EventType, EventPriority, EventBus, Event as BusEvent } from '../infrastructure/events/EventBus';
import { localEventEmitter, LocalEvent } from '../events/LocalEventEmitter';
import { SystemState } from '../state/types';
export declare function createEvent(type: EventType, data: any, source: string, priority?: EventPriority): LocalEvent;
export declare function emitEvent(type: EventType, data: any, source: string, priority?: EventPriority): Promise<string>;
export declare function subscribeToLocalEvents(events: EventType[], callback: (event: LocalEvent) => Promise<void>): () => void;
export declare function subscribeToPersistentEvents(events: EventType[], callback: (event: BusEvent) => Promise<void>): () => void;
export declare function subscribeToAllEvents(events: EventType[], callback: (event: LocalEvent | BusEvent) => Promise<void>): () => void;
export declare function subscribeToStateChanges<K extends keyof SystemState>(key: K, callback: (value: SystemState[K]) => void): () => void;
export declare const eventHandler: {
    createEvent: typeof createEvent;
    emitEvent: typeof emitEvent;
    subscribeToLocalEvents: typeof subscribeToLocalEvents;
    subscribeToPersistentEvents: typeof subscribeToPersistentEvents;
    subscribeToAllEvents: typeof subscribeToAllEvents;
    subscribeToStateChanges: typeof subscribeToStateChanges;
};
export { EventPriority, LocalEvent, BusEvent, EventBus, localEventEmitter };
