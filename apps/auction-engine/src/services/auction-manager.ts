import { RedisService } from './redis';
import { AuctionState, MarathonConfig, TwitterBid, AuctionStatus } from '../types/auction';
import { createLogger } from '../utils/logger';

const logger = createLogger('auction-manager');

export class AuctionManager {
  private redis: RedisService;
  private currentMarathonId: string | null = null;

  constructor() {
    this.redis = new RedisService();
  }

  async getCurrentAuction(marathonId: string): Promise<AuctionState | null> {
    return await this.redis.getCurrentAuction(marathonId);
  }

  async startAuctionMarathon(config: MarathonConfig): Promise<string> {
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
    this.currentMarathonId = marathonId;
    logger.info({ marathonId }, 'Started new auction marathon');
    return marathonId;
  }

  async startDailyAuction(marathonId: string): Promise<void> {
    const state = await this.redis.getCurrentAuction(marathonId);
    if (!state) throw new Error('No active marathon found');
    if (state.status !== 'PENDING') throw new Error('Auction not in PENDING state');

    state.status = 'ACTIVE';
    await this.redis.setCurrentAuction(state);
    logger.info({ marathonId, dayNumber: state.dayNumber }, 'Started daily auction');
  }

  async processBid(marathonId: string, bid: TwitterBid): Promise<boolean> {
    const state = await this.redis.getCurrentAuction(marathonId);
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
      timestamp: new Date(bid.timestamp),
    };

    await this.redis.addBid(state.marathonId, state.dayNumber, formattedBid);
    await this.redis.addUserBid(bid.userId, formattedBid);

    // Update auction state with the new highest bid
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
    if (!this.currentMarathonId) {
      return null;
    }
    return await this.redis.getCurrentAuction(this.currentMarathonId);
  }

  private isValidBid(bid: TwitterBid, state: AuctionState): boolean {
    const bidTime = new Date(bid.timestamp);
    if (bidTime < state.startTime || bidTime > state.endTime) {
      logger.info({
        bid: {
          timestamp: bidTime,
          amount: bid.amount
        },
        auction: {
          startTime: state.startTime,
          endTime: state.endTime
        }
      }, 'Bid rejected: Outside auction time window');
      return false;
    }

    if (state.currentBid && bid.amount <= state.currentBid.amount) {
      logger.info({
        bid: {
          amount: bid.amount
        },
        currentBid: {
          amount: state.currentBid.amount
        }
      }, 'Bid rejected: Not higher than current bid');
      return false;
    }

    logger.info({
      bid: {
        timestamp: bidTime,
        amount: bid.amount
      }
    }, 'Bid validation passed');
    return true;
  }

  private getAuctionStartTime(config: MarathonConfig): Date {
    const now = new Date();
    // For testing, set start time to 15 minutes ago
    now.setMinutes(now.getMinutes() - 15);
    return now;
  }

  private getAuctionEndTime(config: MarathonConfig): Date {
    const now = new Date();
    // For testing, set end time to 45 minutes from now
    now.setMinutes(now.getMinutes() + 45);
    return now;
  }
} 