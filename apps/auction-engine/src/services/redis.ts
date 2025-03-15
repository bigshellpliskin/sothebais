// Using CommonJS-style import to avoid TypeScript issues with Redis
import * as IoRedis from 'ioredis';
// @ts-ignore
const Redis = IoRedis.default || IoRedis;

import type { AuctionState } from '@sothebais/shared/schema/redis/models.js';
import type { MarathonConfig } from '@sothebais/shared/types/auction.js';
import type { TwitterBid as Bid } from '@sothebais/shared/types/twitter.js';

// Interface to extend AuctionState with the properties we need
interface ExtendedAuctionState extends AuctionState {
  marathonId: string;
  dayNumber: number;
}

export class RedisService {
  private client: any; // Using any to avoid type issues

  constructor() {
    const redisPassword = process.env.REDIS_PASSWORD || 'default_password';
    const redisHost = process.env.REDIS_HOST || 'redis';
    const redisPort = process.env.REDIS_PORT || '6379';
    
    // @ts-ignore - Ignore type error for Redis construction
    this.client = new Redis({
      host: redisHost,
      port: parseInt(redisPort),
      password: redisPassword,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    // Log connection events
    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.client.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
    });
  }

  // Health Check Methods
  async checkHealth(): Promise<{status: string; details: any}> {
    try {
      const pingResult = await this.ping();
      const info = await this.getRedisInfo();
      const memoryUsage = await this.getMemoryUsage();
      
      return {
        status: pingResult ? 'healthy' : 'unhealthy',
        details: {
          ping: pingResult,
          connected: this.client.status === 'ready',
          memoryUsage,
          info: {
            version: info.redis_version,
            uptime: info.uptime_in_seconds,
            connectedClients: info.connected_clients,
            usedMemory: info.used_memory_human,
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          connected: false
        }
      };
    }
  }

  private async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  private async getRedisInfo(): Promise<any> {
    const info = await this.client.info();
    return info.split('\r\n').reduce((acc: any, line: string) => {
      const [key, value] = line.split(':');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {});
  }

  private async getMemoryUsage(): Promise<number> {
    const info = await this.getRedisInfo();
    return parseInt(info.used_memory || '0', 10);
  }

  // Marathon Config
  async setMarathonConfig(config: MarathonConfig): Promise<void> {
    await this.client.set('auction:config', JSON.stringify(config));
  }

  async getMarathonConfig(): Promise<MarathonConfig | null> {
    const config = await this.client.get('auction:config');
    return config ? JSON.parse(config) : null;
  }

  // Current Auction State
  async setCurrentAuction(state: ExtendedAuctionState): Promise<void> {
    await this.client.set(`auction:${state.marathonId}:current`, JSON.stringify(state));
  }

  async getCurrentAuction(marathonId: string): Promise<ExtendedAuctionState | null> {
    const state = await this.client.get(`auction:${marathonId}:current`);
    return state ? JSON.parse(state) : null;
  }

  // Bid Management
  async addBid(marathonId: string, dayNumber: number, bid: Bid): Promise<void> {
    const key = `auction:${marathonId}:day:${dayNumber}:bids`;
    await this.client.zadd(key, bid.timestamp.getTime(), JSON.stringify(bid));
  }

  async getHighestBid(marathonId: string, dayNumber: number): Promise<Bid | null> {
    const key = `auction:${marathonId}:day:${dayNumber}:bids`;
    const bids = await this.client.zrevrange(key, 0, 0);
    return bids.length > 0 ? JSON.parse(bids[0]) : null;
  }

  async getBidHistory(marathonId: string, dayNumber: number): Promise<Bid[]> {
    const key = `auction:${marathonId}:day:${dayNumber}:bids`;
    const bids = await this.client.zrange(key, 0, -1);
    return bids.map((bid: string) => JSON.parse(bid));
  }

  // User Bid History
  async addUserBid(userId: string, bid: Bid): Promise<void> {
    const key = `users:${userId}:bids`;
    await this.client.zadd(key, bid.timestamp.getTime(), JSON.stringify(bid));
  }

  async getUserBids(userId: string): Promise<Bid[]> {
    const key = `users:${userId}:bids`;
    const bids = await this.client.zrange(key, 0, -1);
    return bids.map((bid: string) => JSON.parse(bid));
  }

  // Backup Methods
  async createSnapshot(marathonId: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const snapshotKey = `backup:${marathonId}:${timestamp}`;
    
    // Get all relevant data
    const [config, currentState, bids] = await Promise.all([
      this.getMarathonConfig(),
      this.getCurrentAuction(marathonId),
      this.getAllBids(marathonId)
    ]);

    // Store snapshot
    await this.client.set(snapshotKey, JSON.stringify({
      timestamp,
      config,
      currentState,
      bids
    }));

    // Keep only last 24 snapshots
    await this.pruneSnapshots(marathonId);
  }

  async getAllBids(marathonId: string): Promise<{[key: string]: Bid[]}> {
    const state = await this.getCurrentAuction(marathonId);
    if (!state) return {};

    const bids: {[key: string]: Bid[]} = {};
    for (let day = 1; day <= state.dayNumber; day++) {
      bids[day] = await this.getBidHistory(marathonId, day);
    }
    return bids;
  }

  private async pruneSnapshots(marathonId: string, keepLast: number = 24): Promise<void> {
    const pattern = `backup:${marathonId}:*`;
    const keys = await this.client.keys(pattern);
    
    if (keys.length > keepLast) {
      const toDelete = keys
        .sort()
        .slice(0, keys.length - keepLast);
      
      if (toDelete.length > 0) {
        await this.client.del(...toDelete);
      }
    }
  }

  async restoreFromSnapshot(marathonId: string, timestamp?: string): Promise<boolean> {
    try {
      const snapshotKey = timestamp 
        ? `backup:${marathonId}:${timestamp}`
        : await this.getLatestSnapshotKey(marathonId);

      if (!snapshotKey) {
        throw new Error('No snapshot found');
      }

      const snapshot = await this.client.get(snapshotKey);
      if (!snapshot) {
        throw new Error('Snapshot data not found');
      }

      const data = JSON.parse(snapshot);
      
      // Restore data
      await Promise.all([
        data.config && this.setMarathonConfig(data.config),
        data.currentState && this.setCurrentAuction(data.currentState),
        this.restoreBids(marathonId, data.bids)
      ]);

      return true;
    } catch (error) {
      console.error('Restore failed:', error);
      return false;
    }
  }

  private async getLatestSnapshotKey(marathonId: string): Promise<string | null> {
    const pattern = `backup:${marathonId}:*`;
    const keys = await this.client.keys(pattern);
    return keys.sort().pop() || null;
  }

  private async restoreBids(marathonId: string, bids: {[key: string]: Bid[]}): Promise<void> {
    for (const [day, dayBids] of Object.entries(bids)) {
      for (const bid of dayBids) {
        await this.addBid(marathonId, parseInt(day), bid);
      }
    }
  }
} 