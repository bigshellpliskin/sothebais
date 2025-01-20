"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisAdapter = void 0;
class RedisAdapter {
    constructor(redis) {
        this.redis = redis;
        this.tableName = 'memory';
    }
    async init() { }
    async close() { }
    async getAccountById() { return null; }
    async createAccount() { return null; }
    async getMemoryById() { return null; }
    async log() { }
    async getActorDetails() { return null; }
    async updateGoalStatus() { }
    async removeMemory() { }
    async getGoals() { return []; }
    async updateGoal() { }
    async createGoal() { }
    async removeGoal() { }
    async removeAllGoals() { }
    async getRoom() { return null; }
    async createRoom(roomId) {
        const id = roomId || crypto.randomUUID();
        await this.redis.set(`room:${id}`, JSON.stringify({ id }));
        return id;
    }
    async removeRoom() { }
    async updateRoom() { }
    async getRooms() { return []; }
    async searchRooms() { return []; }
    async getParticipant() { return null; }
    async createParticipant() { }
    async removeParticipant(userId, roomId) {
        const key = `participant:${roomId}:${userId}`;
        const exists = await this.redis.exists(key);
        if (exists) {
            await this.redis.del(key);
            return true;
        }
        return false;
    }
    async updateParticipant() { }
    async getParticipants() { return []; }
    async searchParticipants() { return []; }
    async getRoomsForParticipant() { return []; }
    async getRoomsForParticipants() { return []; }
    async addParticipant(userId, roomId) {
        const key = `participant:${roomId}:${userId}`;
        await this.redis.set(key, JSON.stringify({ userId, roomId }));
        return true;
    }
    async getParticipantsForAccount() { return []; }
    async getParticipantsForRoom() { return []; }
    async getParticipantsForRooms() { return []; }
    async getParticipantUserState() { return null; }
    async setParticipantUserState() { }
    async createRelationship(params) {
        const key = `relationship:${params.userA}:${params.userB}`;
        await this.redis.set(key, JSON.stringify(params));
        return true;
    }
    async getRelationship() { return null; }
    async getRelationships() { return []; }
    async createMemory(memory) {
        await this.redis.set(`memory:${memory.id}`, JSON.stringify(memory));
    }
    async getMemory(id) {
        const data = await this.redis.get(`memory:${id}`);
        return data ? JSON.parse(data) : null;
    }
    async getMemories() {
        const keys = await this.redis.keys('memory:*');
        const memories = await Promise.all(keys.map(key => this.redis.get(key)));
        return memories.map(m => m ? JSON.parse(m) : null).filter(Boolean);
    }
    async deleteMemory(id) {
        await this.redis.del(`memory:${id}`);
    }
    async addEmbeddingToMemory(memory) {
        await this.redis.set(`memory:${memory.id}`, JSON.stringify(memory));
        return memory;
    }
    async searchMemories() { return []; }
    async updateMemory(memory) {
        await this.redis.set(`memory:${memory.id}`, JSON.stringify(memory));
    }
    async deleteMemories() { }
    async getMemoriesByUserId() { return []; }
    async getMemoriesByRoomId() { return []; }
    async getCachedEmbeddings() { return []; }
    async getMemoriesByRoomIds() { return []; }
    async searchMemoriesByEmbedding() { return []; }
    async removeAllMemories() { }
    async countMemories() { return 0; }
    // ICacheManager
    async get(key) {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    async set(key, value) {
        await this.redis.set(key, JSON.stringify(value));
    }
    async delete(key) {
        await this.redis.del(key);
    }
    // IRAGKnowledgeManager
    async getKnowledge() { return null; }
    async createKnowledge() { }
    async removeKnowledge() { }
    async searchKnowledge() { return []; }
    async updateKnowledge() { }
    async listKnowledge() { return []; }
    async clearKnowledge() { }
    async processFile() { }
}
exports.RedisAdapter = RedisAdapter;
