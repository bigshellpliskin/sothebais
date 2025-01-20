import { EventBus, EventType, Event } from './EventBus';
import { IAgentRuntime } from "@elizaos/core";
export declare function createEventBus(runtime: IAgentRuntime): EventBus;
export declare const eventHandler: EventBus;
export { EventType, Event };
export * from './EventHandler';
