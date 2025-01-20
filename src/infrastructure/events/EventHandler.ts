import { DatabaseAdapter } from '../database/DatabaseAdapter';
import { 
    EventType,
    EventPriority,
    EventMetadata,
    Event,
    EventCallback,
    EventBusConfig,
    EventBus
} from './EventBus';

export {
    EventType,
    EventPriority,
    EventMetadata,
    Event,
    EventCallback,
    EventBusConfig,
    EventBus
};

// Create singleton database instance
const db = new DatabaseAdapter({} as any, {
    type: 'sqlite',
    connection: ':memory:'
});

// Export singleton instance
export const eventBus = new EventBus(db);