import { EventType, EventPriority, EventBus as EventBusClass, EventCallback, Event as PersistentEvent } from '../infrastructure/events/EventBus';
import { localEventEmitter, LocalEvent } from './LocalEventEmitter';
import { SystemState } from '../state/types';
import { IAgentRuntime } from "@elizaos/core";
declare global {
    var runtime: IAgentRuntime;
}
declare const eventBus: EventBusClass;
export declare function createEvent(type: EventType, data: any, source: string, priority?: EventPriority): LocalEvent;
export declare function emitEvent(type: EventType, data: any, source: string, priority?: EventPriority): Promise<string>;
export declare function subscribeToLocalEvents(events: EventType[], callback: (event: LocalEvent) => Promise<void>): () => void;
export declare function subscribeToPersistentEvents(events: EventType[], callback: EventCallback): () => void;
export declare function subscribeToAllEvents(events: EventType[], callback: (event: PersistentEvent) => Promise<void>): () => void;
export declare function subscribeToStateChanges<K extends keyof SystemState>(key: K, callback: (value: SystemState[K]) => void): () => void;
export { EventType, EventPriority, LocalEvent as Event, EventBusClass as EventBus, localEventEmitter, eventBus };
