"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRuntime = void 0;
const core_1 = require("@elizaos/core");
const RedisAdapter_1 = require("./RedisAdapter");
const uuid_1 = require("uuid");
class AgentRuntime {
    constructor(redis, eventHandler, stateManager) {
        this.redis = redis;
        this.eventHandler = eventHandler;
        this.stateManager = stateManager;
        this.serverUrl = process.env.SERVER_URL || 'http://localhost:7998';
        this.token = process.env.AGENT_TOKEN || 'default-token';
        this.modelProvider = core_1.ModelProviderName.ANTHROPIC;
        this.imageModelProvider = core_1.ModelProviderName.ANTHROPIC;
        this.imageVisionModelProvider = core_1.ModelProviderName.ANTHROPIC;
        this.character = {
            name: 'Auction Agent',
            modelProvider: core_1.ModelProviderName.ANTHROPIC,
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
        this.providers = [];
        this.actions = [];
        this.services = new Map();
        this.managers = [];
        this.plugins = [];
        this.evaluators = [];
        this.clients = [];
        const id = (0, uuid_1.v4)();
        this.agentId = id;
        this.redisAdapter = new RedisAdapter_1.RedisAdapter(redis);
    }
    get databaseAdapter() { return this.redisAdapter; }
    get messageManager() { return this.redisAdapter; }
    get descriptionManager() { return this.redisAdapter; }
    get loreManager() { return this.redisAdapter; }
    get documentsManager() { return this.redisAdapter; }
    get knowledgeManager() { return this.redisAdapter; }
    get ragKnowledgeManager() { return this.redisAdapter; }
    get relationshipManager() { return this.redisAdapter; }
    get cacheManager() { return this.redisAdapter; }
    getSetting(key) {
        return process.env[key] || null;
    }
    async initialize() {
        await this.databaseAdapter.init();
    }
    registerMemoryManager(manager) {
        // Not needed as we're using Redis adapter for all memory management
    }
    async registerService(service) {
        this.services.set(service.constructor.name, service);
    }
    async registerProvider(provider) {
        this.providers.push(provider);
    }
    async registerAction(action) {
        this.actions.push(action);
    }
    async registerPlugin(plugin) {
        this.plugins.push(plugin);
    }
    async cleanup() {
        await this.databaseAdapter.close();
    }
    getService(type) {
        return this.services.get(type) || null;
    }
    getMemoryManager(type) {
        return this.redisAdapter;
    }
    // Required IAgentRuntime methods
    getConversationLength() {
        return 10;
    }
    async processActions(message, responses, state, callback) {
        // Process actions implementation
    }
    async evaluate(message, state, didRespond) {
        return {};
    }
    async ensureParticipantExists() { }
    async getParticipant() { return null; }
    async updateParticipant() { }
    async deleteParticipant() { }
    async getParticipants() { return []; }
    async searchParticipants() { return []; }
    // Add missing methods
    async ensureUserExists() { }
    async ensureConnection() { }
    async ensureParticipantInRoom() { }
    async ensureRoomExists() { }
    async composeState() { return {}; }
    async updateState() { }
    async updateRecentMessageState(state) { return state; }
}
exports.AgentRuntime = AgentRuntime;
