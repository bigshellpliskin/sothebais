import { RedisClientType } from 'redis';
import { 
    IAgentRuntime, 
    IMemoryManager, 
    Service, 
    Provider, 
    Action, 
    Plugin, 
    ModelProviderName, 
    Character,
    ServiceType,
    Memory,
    State,
    HandlerCallback
} from '@elizaos/core';
import { StateManager } from '../state/types';
import { RedisAdapter } from './RedisAdapter';
import { v4 as uuidv4 } from 'uuid';

export class AgentRuntime implements IAgentRuntime {
    private redisAdapter: RedisAdapter;
    private _eventHandler: any;

    public readonly agentId: `${string}-${string}-${string}-${string}-${string}`;
    public readonly serverUrl: string = process.env.SERVER_URL || 'http://localhost:7998';
    public readonly token: string = process.env.AGENT_TOKEN || 'default-token';
    public readonly modelProvider: ModelProviderName = ModelProviderName.ANTHROPIC;
    public readonly imageModelProvider: ModelProviderName = ModelProviderName.ANTHROPIC;
    public readonly imageVisionModelProvider: ModelProviderName = ModelProviderName.ANTHROPIC;
    
    public readonly character: Character = {
        name: 'Auction Agent',
        modelProvider: ModelProviderName.ANTHROPIC,
        bio: 'An AI agent that manages NFT auctions',
        lore: [],
        messageExamples: [],
        postExamples: [],
        settings: {
            secrets: {}
        },
        topics: [],
        adjectives: [],
        clients: [],
        plugins: [],
        style: {
            all: [],
            chat: [],
            post: []
        }
    };

    public readonly providers: Provider[] = [];
    public readonly actions: Action[] = [];
    public readonly services = new Map<ServiceType, Service>();
    public readonly managers: any[] = [];
    public readonly plugins: Plugin[] = [];
    public readonly evaluators: any[] = [];
    public readonly clients: any[] = [];

    constructor(
        public readonly redis: RedisClientType<any>,
        eventHandler: any,
        public readonly stateManager: StateManager
    ) {
        const id = uuidv4();
        this.agentId = id as `${string}-${string}-${string}-${string}-${string}`;
        this.redisAdapter = new RedisAdapter(redis);
        this._eventHandler = eventHandler;
    }

    public get eventHandler(): any {
        return this._eventHandler;
    }

    public setEventHandler(handler: any): void {
        this._eventHandler = handler;
    }

    public get databaseAdapter() { return this.redisAdapter; }
    public get messageManager() { return this.redisAdapter; }
    public get descriptionManager() { return this.redisAdapter; }
    public get loreManager() { return this.redisAdapter; }
    public get documentsManager() { return this.redisAdapter; }
    public get knowledgeManager() { return this.redisAdapter; }
    public get ragKnowledgeManager() { return this.redisAdapter; }
    public get relationshipManager() { return this.redisAdapter; }
    public get cacheManager() { return this.redisAdapter; }

    getSetting(key: string): string | null {
        return process.env[key] || null;
    }

    async initialize(): Promise<void> {
        await this.databaseAdapter.init();
    }

    registerMemoryManager(manager: IMemoryManager): void {
        // Not needed as we're using Redis adapter for all memory management
    }

    async registerService(service: Service): Promise<void> {
        this.services.set(service.constructor.name as ServiceType, service);
    }

    async registerProvider(provider: Provider): Promise<void> {
        this.providers.push(provider);
    }

    async registerAction(action: Action): Promise<void> {
        this.actions.push(action);
    }

    async registerPlugin(plugin: Plugin): Promise<void> {
        this.plugins.push(plugin);
    }

    async cleanup(): Promise<void> {
        await this.databaseAdapter.close();
    }

    getService<T extends Service>(type: ServiceType): T | null {
        return (this.services.get(type) as T) || null;
    }

    getMemoryManager(type: string): IMemoryManager {
        return this.redisAdapter;
    }

    // Required IAgentRuntime methods
    getConversationLength(): number {
        return 10;
    }

    async processActions(message: Memory, responses: Memory[], state?: State, callback?: HandlerCallback): Promise<void> {
        // Process actions implementation
    }

    async evaluate(message: Memory, state: State, didRespond: boolean): Promise<any> {
        return {};
    }

    async ensureParticipantExists(): Promise<void> {}
    async getParticipant(): Promise<any> { return null; }
    async updateParticipant(): Promise<void> {}
    async deleteParticipant(): Promise<void> {}
    async getParticipants(): Promise<any[]> { return []; }
    async searchParticipants(): Promise<any[]> { return []; }

    // Add missing methods
    async ensureUserExists(): Promise<void> {}
    async ensureConnection(): Promise<void> {}
    async ensureParticipantInRoom(): Promise<void> {}
    async ensureRoomExists(): Promise<void> {}
    async composeState(): Promise<State> { return {} as State; }
    async updateState(): Promise<void> {}
    async updateRecentMessageState(state: State): Promise<State> { return state; }
} 