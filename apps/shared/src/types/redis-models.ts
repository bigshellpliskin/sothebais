/**
 * Redis Models Types
 * 
 * This file contains TypeScript types for Redis models.
 * These are separate from the schema definitions but match their structure.
 */

// AuctionState represents the current state of an auction in Redis
export interface AuctionState {
  id: string;             // Auction ID
  sessionId: string;      // Session ID this auction belongs to
  artItemId: string;      // ID of the art item being auctioned
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'SETTLED' | 'CANCELLED'; // Current auction status
  startTime: string;      // ISO date string for auction start
  endTime: string;        // ISO date string for auction end
  highestBidId?: string;  // ID of the highest bid (if any)
  currency: string;       // Currency for this auction (e.g., 'ETH')
  lotOrder: number;       // The order/position of this lot in the session
} 