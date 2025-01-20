import { RedisClientType } from 'redis';
import { IAgentRuntime, IMemoryManager, Service, Provider, Action, Plugin, ModelProviderName, Character, ServiceType, Memory, State, HandlerCallback } from '@elizaos/core';
import { StateManager } from '../state/types';
import { RedisAdapter } from './RedisAdapter';
export declare class AgentRuntime implements IAgentRuntime {
    readonly redis: RedisClientType<any>;
    readonly stateManager: StateManager;
    private redisAdapter;
    private _eventHandler;
    readonly agentId: `${string}-${string}-${string}-${string}-${string}`;
    readonly serverUrl: string;
    readonly token: string;
    readonly modelProvider: ModelProviderName;
    readonly imageModelProvider: ModelProviderName;
    readonly imageVisionModelProvider: ModelProviderName;
    readonly character: Character;
    readonly providers: Provider[];
    readonly actions: Action[];
    readonly services: Map<ServiceType, Service>;
    readonly managers: any[];
    readonly plugins: Plugin[];
    readonly evaluators: any[];
    readonly clients: any[];
    constructor(redis: RedisClientType<any>, eventHandler: any, stateManager: StateManager);
    get eventHandler(): any;
    setEventHandler(handler: any): void;
    get databaseAdapter(): RedisAdapter;
    get messageManager(): RedisAdapter;
    get descriptionManager(): RedisAdapter;
    get loreManager(): RedisAdapter;
    get documentsManager(): RedisAdapter;
    get knowledgeManager(): RedisAdapter;
    get ragKnowledgeManager(): RedisAdapter;
    get relationshipManager(): RedisAdapter;
    get cacheManager(): RedisAdapter;
    getSetting(key: string): string | null;
    initialize(): Promise<void>;
    registerMemoryManager(manager: IMemoryManager): void;
    registerService(service: Service): Promise<void>;
    registerProvider(provider: Provider): Promise<void>;
    registerAction(action: Action): Promise<void>;
    registerPlugin(plugin: Plugin): Promise<void>;
    cleanup(): Promise<void>;
    getService<T extends Service>(type: ServiceType): T | null;
    getMemoryManager(type: string): IMemoryManager;
    getConversationLength(): number;
    processActions(message: Memory, responses: Memory[], state?: State, callback?: HandlerCallback): Promise<void>;
    evaluate(message: Memory, state: State, didRespond: boolean): Promise<any>;
    ensureParticipantExists(): Promise<void>;
    getParticipant(): Promise<any>;
    updateParticipant(): Promise<void>;
    deleteParticipant(): Promise<void>;
    getParticipants(): Promise<any[]>;
    searchParticipants(): Promise<any[]>;
    ensureUserExists(): Promise<void>;
    ensureConnection(): Promise<void>;
    ensureParticipantInRoom(): Promise<void>;
    ensureRoomExists(): Promise<void>;
    composeState(): Promise<State>;
    updateState(): Promise<void>;
    updateRecentMessageState(state: State): Promise<State>;
}
