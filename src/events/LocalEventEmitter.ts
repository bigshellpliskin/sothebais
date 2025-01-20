import { EventType } from '../infrastructure/events/EventBus';

export interface LocalEvent {
    type: EventType;
    data: any;
    timestamp: number;
    source: string;
}

export type LocalEventCallback = (event: LocalEvent) => Promise<void>;

export class LocalEventEmitter {
    private subscribers: Map<EventType, Set<LocalEventCallback>>;
    private eventLog: LocalEvent[];
    private readonly MAX_LOG_SIZE = 1000;

    constructor() {
        this.subscribers = new Map();
        this.eventLog = [];
    }

    async emit(event: LocalEvent): Promise<void> {
        this.logEvent(event);
        const callbacks = this.subscribers.get(event.type) || new Set();
        const promises = Array.from(callbacks).map(callback => {
            try {
                return callback(event);
            } catch (error) {
                console.error(`Error executing callback for event ${event.type}:`, error);
                return Promise.reject(error);
            }
        });
        await Promise.allSettled(promises);
    }

    subscribe(type: EventType, callback: LocalEventCallback): () => void {
        if (!this.subscribers.has(type)) {
            this.subscribers.set(type, new Set());
        }
        this.subscribers.get(type)!.add(callback);
        return () => {
            this.subscribers.get(type)?.delete(callback);
        };
    }

    private logEvent(event: LocalEvent): void {
        this.eventLog.push(event);
        if (this.eventLog.length > this.MAX_LOG_SIZE) {
            this.eventLog = this.eventLog.slice(-this.MAX_LOG_SIZE);
        }
    }

    getEventLog(): LocalEvent[] {
        return [...this.eventLog];
    }

    clear(): void {
        this.subscribers.clear();
        this.eventLog = [];
    }
}

// Export singleton instance
export const localEventEmitter = new LocalEventEmitter(); 