/**
 * Auction Types
 * 
 * Shared types for auction functionality used across services
 */

import { AuctionState } from '../schema/redis/models.js';

/**
 * Auction bid data structure
 */
export interface AuctionBid {
  id: string;
  userId: string;
  amount: string;
  currency: string;
  timestamp: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

/**
 * Auction marathon configuration
 */
export interface MarathonConfig {
  totalDays: number;
  dailyStartTime: string; // Format: "HH:MM" in 24h format
  dailyEndTime: string;   // Format: "HH:MM" in 24h format
  minBidIncrement?: number;
  currency: string;
  startingPrice?: number;
}

/**
 * Auction status
 */
export type AuctionStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'SETTLED' | 'CANCELLED';

/**
 * Auction event types
 */
export type AuctionEventType = 
  | 'AUCTION_CREATED'
  | 'AUCTION_STARTED'
  | 'BID_PLACED'
  | 'AUCTION_EXTENDED'
  | 'AUCTION_ENDED'
  | 'AUCTION_SETTLED';

/**
 * Auction event data
 */
export interface AuctionEvent {
  type: AuctionEventType;
  auctionId: string;
  timestamp: string;
  data?: any;
}

/**
 * Auction statistics
 */
export interface AuctionStats {
  totalBids: number;
  uniqueBidders: number;
  highestBid?: AuctionBid;
  bidHistory: AuctionBid[];
} 