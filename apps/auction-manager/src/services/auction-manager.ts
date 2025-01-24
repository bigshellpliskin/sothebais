import { RedisService } from './redis';
import { AuctionState, MarathonConfig, TwitterBid, AuctionStatus } from '../types/auction';
import { createLogger } from '../utils/logger';

const logger = createLogger('auction-manager');

export class AuctionManager {
  private redis: RedisService;

  constructor() {
    this.redis = new RedisService();
  }

  async startAuctionMarathon(config: MarathonConfig): Promise<void> {
    await this.redis.setMarathonConfig(config);
    
    const marathonId = new Date().getTime().toString();
    const state: AuctionState = {
      marathonId,
      dayNumber: 1,
      status: 'PENDING',
      currentBid: null,
      startTime: this.getAuctionStartTime(config),
      endTime: this.getAuctionEndTime(config),
    };

    await this.redis.setCurrentAuction(state);
    logger.info({ marathonId }, 'Started new auction marathon');
  }

  async startDailyAuction(marathonId: string): Promise<void> {
    const state = await this.redis.getCurrentAuction(marathonId);
    if (!state) throw new Error('No active marathon found');
    if (state.status !== 'PENDING') throw new Error('Auction not in PENDING state');

    state.status = 'ACTIVE';
    await this.redis.setCurrentAuction(state);
    logger.info({ marathonId, dayNumber: state.dayNumber }, 'Started daily auction');
  }

  async processBid(bid: TwitterBid): Promise<boolean> {
    const state = await this.getCurrentAuctionState();
    if (!state) throw new Error('No active auction found');
    if (state.status !== 'ACTIVE') throw new Error('Auction not active');

    if (!this.isValidBid(bid, state)) {
      logger.info({ bid }, 'Invalid bid rejected');
      return false;
    }

    const formattedBid = {
      userId: bid.userId,
      tweetId: bid.tweetId,
      amount: bid.amount,
      timestamp: bid.timestamp,
    };

    await this.redis.addBid(state.marathonId, state.dayNumber, formattedBid);
    await this.redis.addUserBid(bid.userId, formattedBid);

    const highestBid = await this.redis.getHighestBid(state.marathonId, state.dayNumber);
    if (highestBid && highestBid.amount >= bid.amount) {
      return false;
    }

    state.currentBid = formattedBid;
    await this.redis.setCurrentAuction(state);
    logger.info({ bid }, 'New highest bid accepted');
    return true;
  }

  async endDailyAuction(marathonId: string): Promise<void> {
    const state = await this.redis.getCurrentAuction(marathonId);
    if (!state) throw new Error('No active marathon found');
    if (state.status !== 'ACTIVE') throw new Error('Auction not in ACTIVE state');

    state.status = 'PROCESSING';
    await this.redis.setCurrentAuction(state);

    // Process winner
    const winner = await this.redis.getHighestBid(marathonId, state.dayNumber);
    if (winner) {
      logger.info({ winner }, 'Auction winner determined');
      // TODO: Trigger winner processing (blockchain, etc.)
    }

    // Prepare for next day
    if (state.dayNumber < 30) {
      const config = await this.redis.getMarathonConfig();
      if (!config) throw new Error('Marathon configuration not found');

      state.dayNumber += 1;
      state.status = 'PENDING';
      state.currentBid = null;
      state.startTime = this.getAuctionStartTime(config);
      state.endTime = this.getAuctionEndTime(config);
    } else {
      state.status = 'COMPLETED';
    }

    await this.redis.setCurrentAuction(state);
    logger.info({ marathonId, dayNumber: state.dayNumber }, 'Ended daily auction');
  }

  private async getCurrentAuctionState(): Promise<AuctionState | null> {
    const config = await this.redis.getMarathonConfig();
    if (!config) return null;

    const marathons = await this.redis.getCurrentAuction(config.toString());
    return marathons;
  }

  private isValidBid(bid: TwitterBid, state: AuctionState): boolean {
    if (bid.timestamp < state.startTime || bid.timestamp > state.endTime) {
      return false;
    }

    if (state.currentBid && bid.amount <= state.currentBid.amount) {
      return false;
    }

    // TODO: Add more validation (user eligibility, etc.)
    return true;
  }

  private getAuctionStartTime(config: MarathonConfig): Date {
    // TODO: Implement proper timezone handling
    return new Date();
  }

  private getAuctionEndTime(config: MarathonConfig): Date {
    // TODO: Implement proper timezone handling
    const end = new Date();
    end.setHours(end.getHours() + 1);
    return end;
  }
} 