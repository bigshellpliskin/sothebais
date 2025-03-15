/**
 * Auction Types
 * 
 * Shared types for auction functionality used across services
 */

import type { AuctionState } from './redis-models.js';

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
  startDate: string;
  endDate: string;
  currency: string;
  minBid: number;
  bidIncrement: number;
  auctionDuration: number; // in hours
  breakDuration: number; // in hours
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

export type { AuctionState }; 