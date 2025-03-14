import { RedisService } from './redis.js';
import type { AuctionState } from '@sothebais/shared/schema/redis/models.js';
import type { MarathonConfig, AuctionStatus } from '@sothebais/shared/types/auction.js';
import type { TwitterBid } from '@sothebais/shared/types/twitter.js';
import { logger } from '@sothebais/shared/utils/logger.js';

export class AuctionManager {
  private redis: RedisService;
  private currentMarathonId: string | null = null;

  constructor() {
    this.redis = new RedisService();
  }

  async getCurrentAuction(marathonId: string): Promise<AuctionState | null> {
    return this.redis.getCurrentAuction(marathonId);
  }

  async startAuctionMarathon(config: MarathonConfig): Promise<string> {
    const marathonId = `marathon-${Date.now()}`;
    
    try {
      // Store marathon configuration
      await this.redis.setMarathonConfig(config);
      
      // Set as current marathon
      this.currentMarathonId = marathonId;
      
      logger.info('Started auction marathon', { marathonId, config });
      
      // Start day 1 auction
      const startTime = this.getAuctionStartTime(config);
      const endTime = this.getAuctionEndTime(config);
      
      const initialState: AuctionState = {
        id: marathonId,
        sessionId: marathonId, // Using marathon ID as session ID for now
        artItemId: 'day-1', // Placeholder
        status: 'SCHEDULED', // Use a valid status from the type
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        currency: config.currency,
        lotOrder: 1
      };
      
      await this.redis.setCurrentAuction(initialState);
      
      return marathonId;
    } catch (error) {
      logger.error('Failed to start auction marathon', {
        error: error instanceof Error ? error.message : 'Unknown error',
        marathonId,
        config
      });
      throw error;
    }
  }

  async startDailyAuction(marathonId: string): Promise<void> {
    try {
      const state = await this.redis.getCurrentAuction(marathonId);
      
      if (!state) {
        throw new Error(`No auction found for marathon ID: ${marathonId}`);
      }
      
      // Update state to ACTIVE
      state.status = 'ACTIVE';
      await this.redis.setCurrentAuction(state);
      
      logger.info('Started daily auction', { marathonId, lotOrder: state.lotOrder });
    } catch (error) {
      logger.error('Failed to start daily auction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        marathonId
      });
      throw error;
    }
  }

  async processBid(marathonId: string, bid: TwitterBid): Promise<boolean> {
    try {
      const state = await this.redis.getCurrentAuction(marathonId);
      
      if (!state) {
        logger.warn('No active auction found for bid', { marathonId, bidUserId: bid.userId });
        return false;
      }
      
      if (state.status !== 'ACTIVE') {
        logger.warn('Auction not active for bid', { 
          marathonId, 
          status: state.status,
          bidUserId: bid.userId 
        });
        return false;
      }
      
      const highestBid = await this.redis.getHighestBid(marathonId, state.lotOrder);
      const currentBidAmount = highestBid?.amount || 0;
      const currentBidUserId = highestBid?.userId || '';
      
      if (!this.isValidBid(bid, currentBidAmount, currentBidUserId)) {
        logger.warn('Invalid bid rejected', { 
          marathonId, 
          bidUserId: bid.userId,
          bidAmount: bid.amount,
          currentBidAmount
        });
        return false;
      }
      
      // Store the highest bid ID in the auction state
      state.highestBidId = bid.tweetId;
      await this.redis.setCurrentAuction(state);
      
      // Store bid in history
      await this.redis.addBid(marathonId, state.lotOrder, {
        id: bid.tweetId,
        userId: bid.userId,
        amount: bid.amount.toString(),
        currency: 'ETH', // Hardcoded for now, should come from config
        timestamp: new Date().toISOString(),
        status: 'ACCEPTED'
      });
      
      logger.info('Processed new bid', { 
        marathonId, 
        lotOrder: state.lotOrder,
        bidUserId: bid.userId,
        bidAmount: bid.amount
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to process bid', {
        error: error instanceof Error ? error.message : 'Unknown error',
        marathonId,
        bidUserId: bid.userId
      });
      throw error;
    }
  }

  async endDailyAuction(marathonId: string): Promise<void> {
    try {
      const state = await this.redis.getCurrentAuction(marathonId);
      
      if (!state) {
        throw new Error(`No auction found for marathon ID: ${marathonId}`);
      }
      
      if (state.status !== 'ACTIVE') {
        logger.warn('Attempting to end auction that is not active', { 
          marathonId, 
          status: state.status
        });
        return;
      }
      
      // Update state to ENDED
      state.status = 'ENDED';
      await this.redis.setCurrentAuction(state);
      
      logger.info('Ending daily auction', { marathonId, lotOrder: state.lotOrder });
      
      // Process winner
      const highestBid = await this.redis.getHighestBid(marathonId, state.lotOrder);
      if (highestBid) {
        logger.info('Auction ended with winning bid', { 
          marathonId,
          lotOrder: state.lotOrder,
          winningUserId: highestBid.userId,
          winningAmount: highestBid.amount
        });
        
        // Here you would process the winning bid (e.g., trigger NFT minting)
        // await this.processWinner(highestBid, marathonId, state.lotOrder);
      } else {
        logger.info('Auction ended with no bids', { 
          marathonId, 
          lotOrder: state.lotOrder
        });
      }
      
      // Set up next day's auction
      const config = await this.redis.getMarathonConfig();
      const nextLotOrder = state.lotOrder + 1;
      const startTime = this.getAuctionStartTime(config);
      const endTime = this.getAuctionEndTime(config);
      
      const newState: AuctionState = {
        id: marathonId,
        sessionId: marathonId,
        artItemId: `day-${nextLotOrder}`, // Placeholder
        status: 'SCHEDULED',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        currency: config.currency,
        lotOrder: nextLotOrder
      };
      
      await this.redis.setCurrentAuction(newState);
      
      logger.info('Set up next day auction', { 
        marathonId, 
        nextLotOrder
      });
    } catch (error) {
      logger.error('Failed to end daily auction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        marathonId
      });
      throw error;
    }
  }

  private async getCurrentAuctionState(): Promise<AuctionState | null> {
    if (!this.currentMarathonId) {
      return null;
    }
    
    return this.redis.getCurrentAuction(this.currentMarathonId);
  }

  private isValidBid(bid: TwitterBid, currentBidAmount: number, currentBidUserId: string): boolean {
    // Check if bid is higher than current bid
    if (currentBidAmount > 0) {
      const minIncrement = currentBidAmount * 0.1;
      const minValidBid = currentBidAmount + minIncrement;
      
      if (bid.amount < minValidBid) {
        logger.debug('Bid too low', { 
          currentBid: currentBidAmount,
          requiredBid: minValidBid,
          actualBid: bid.amount
        });
        return false;
      }
      
      // Check if same user is trying to outbid themselves
      if (bid.userId === currentBidUserId) {
        logger.debug('User attempting to outbid themselves', { 
          userId: bid.userId
        });
        // This might be allowed, depending on your rules
        // return false;
      }
    } else {
      // For first bid, check if it meets minimum starting bid
      const minStartingBid = 0.1; // ETH
      if (bid.amount < minStartingBid) {
        logger.debug('Starting bid too low', { 
          minStartingBid,
          actualBid: bid.amount
        });
        return false;
      }
    }
    
    return true;
  }

  private getAuctionStartTime(config: MarathonConfig): Date {
    // Implementation depends on your specific requirements
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(parseInt(config.dailyStartTime.split(':')[0]));
    startTime.setMinutes(parseInt(config.dailyStartTime.split(':')[1]));
    startTime.setSeconds(0);
    return startTime;
  }

  private getAuctionEndTime(config: MarathonConfig): Date {
    // Implementation depends on your specific requirements
    const now = new Date();
    const endTime = new Date(now);
    endTime.setHours(parseInt(config.dailyEndTime.split(':')[0]));
    endTime.setMinutes(parseInt(config.dailyEndTime.split(':')[1]));
    endTime.setSeconds(0);
    return endTime;
  }
} 