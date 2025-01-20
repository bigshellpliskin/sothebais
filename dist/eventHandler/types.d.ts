import { EventType } from '../infrastructure/events/EventBus';
export interface LocalEvent {
    type: EventType;
    data: any;
    timestamp: number;
    source: string;
}
export type LocalEventCallback = (event: LocalEvent) => Promise<void>;
export declare class LocalEventEmitter {
    private subscribers;
    private eventLog;
    private readonly MAX_LOG_SIZE;
    constructor();
    emit(event: LocalEvent): Promise<void>;
    subscribe(type: EventType, callback: LocalEventCallback): () => void;
    private logEvent;
    getEventLog(): LocalEvent[];
    clear(): void;
}
export declare const localEventEmitter: LocalEventEmitter;
