import { RedisService } from './redis.js';
import type { AuctionState } from '@sothebais/packages/schema/redis/models.js';
import type { MarathonConfig, AuctionStatus } from '@sothebais/packages/types/auction.js';
import type { TwitterBid } from '@sothebais/packages/types/twitter.js';
import { logger } from '@sothebais/packages/utils/logger.js';

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
      
      const initialState = {
        id: marathonId,
        marathonId,
        dayNumber: 1,
        sessionId: marathonId, // Using marathon ID as session ID for now
        artItemId: 'day-1', // Placeholder
        status: 'SCHEDULED' as AuctionStatus, // Use a valid status from the type
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
      await this.redis.addBid(marathonId, state.lotOrder, bid);
      
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
      if (!config) {
        throw new Error('Marathon config not found');
      }
      
      const nextLotOrder = state.lotOrder + 1;
      const startTime = this.getAuctionStartTime(config);
      const endTime = this.getAuctionEndTime(config);
      
      const newState = {
        id: marathonId,
        marathonId,
        dayNumber: nextLotOrder,
        sessionId: marathonId,
        artItemId: `day-${nextLotOrder}`, // Placeholder
        status: 'SCHEDULED' as AuctionStatus,
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
    const now = new Date();
    // Ensure we have a starting date
    const startDate = config.startDate ? new Date(config.startDate) : now;
    
    // Set auction start time based on current time plus a small offset
    const startTime = new Date(startDate);
    startTime.setHours(now.getHours());
    startTime.setMinutes(now.getMinutes() + 5); // Start 5 minutes from now
    startTime.setSeconds(0);
    
    return startTime;
  }

  private getAuctionEndTime(config: MarathonConfig): Date {
    // Get the start time and add the auction duration
    const startTime = this.getAuctionStartTime(config);
    const endTime = new Date(startTime);
    
    // Add the auction duration (in hours)
    endTime.setHours(endTime.getHours() + (config.auctionDuration || 24));
    
    return endTime;
  }
} 