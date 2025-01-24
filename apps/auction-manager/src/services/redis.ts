import Redis from 'ioredis';
import { AuctionState, Bid, MarathonConfig } from '../types/auction';

export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
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
  async setCurrentAuction(state: AuctionState): Promise<void> {
    await this.client.set(`auction:${state.marathonId}:current`, JSON.stringify(state));
  }

  async getCurrentAuction(marathonId: string): Promise<AuctionState | null> {
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
    return bids.map(bid => JSON.parse(bid));
  }

  // User Bid History
  async addUserBid(userId: string, bid: Bid): Promise<void> {
    const key = `users:${userId}:bids`;
    await this.client.zadd(key, bid.timestamp.getTime(), JSON.stringify(bid));
  }

  async getUserBids(userId: string): Promise<Bid[]> {
    const key = `users:${userId}:bids`;
    const bids = await this.client.zrange(key, 0, -1);
    return bids.map(bid => JSON.parse(bid));
  }
} 