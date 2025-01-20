import { EventBus } from './EventBus';
import { DatabaseAdapter } from '../database/DatabaseAdapter';
import { IAgentRuntime } from "@elizaos/core";

// Create and initialize the event bus
export function createEventBus(runtime: IAgentRuntime): EventBus {
    const dbAdapter = new DatabaseAdapter(runtime, {
        type: 'sqlite',
        connection: ':memory:'
    });
    return new EventBus(dbAdapter);
} 