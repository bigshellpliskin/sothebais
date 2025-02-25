/**
 * Model Types
 * 
 * This file defines TypeScript interfaces for database models.
 * These are used for type safety during development and don't represent the actual database schema.
 */

// User Types
export interface User {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email?: string;
  twitterHandle?: string;
  walletAddress?: string;
  name?: string;
  avatarUrl?: string;
  isAdmin: boolean;
}

export interface UserPreference {
  id: string;
  userId: string;
  notificationsEnabled: boolean;
  bidConfirmations: boolean;
  outbidAlerts: boolean;
  auctionReminders: boolean;
  theme: string;
}

// Campaign Types
export interface Campaign {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  collectionId?: string;
}

// Collection Types
export interface Collection {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  description?: string;
  projectName?: string;
  imageUrl?: string;
  contractAddress?: string;
  blockchain?: string;
}

// Art Item Types
export interface ArtItem {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  tokenId?: string;
  name: string;
  description?: string;
  imageUrl: string;
  animationUrl?: string;
  metadata?: Record<string, any>;
  collectionId?: string;
}

// Auction Types
export interface Auction {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  startTime: Date;
  endTime: Date;
  reservePrice?: number;
  minBidIncrement?: number;
  currency: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'SETTLED' | 'CANCELLED';
  campaignId?: string;
  artItemId: string;
  winningBidId?: string;
}

// Bid Types
export interface Bid {
  id: string;
  createdAt: Date;
  amount: number;
  currency: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WINNING';
  source: 'TWITTER' | 'WEBSITE' | 'API';
  transactionHash?: string;
  userId: string;
  auctionId: string;
}

// Character Types
export interface Character {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  description?: string;
  personality?: string;
  voiceId?: string;
  defaultExpression?: string;
  expressions?: string[];
  backgrounds?: string[];
  memory?: Record<string, any>;
}

// Stream Asset Types
export interface StreamAsset {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  type: 'BACKGROUND' | 'OVERLAY' | 'NFT' | 'CHARACTER' | 'EXPRESSION';
  path: string;
  metadata?: Record<string, any>;
}

// Event Log Types
export interface EventLog {
  id: string;
  timestamp: Date;
  type: string;
  source: string;
  data: Record<string, any>;
}

// Data Transfer Objects (DTOs)
// These are simplified versions of the models used for API responses

export interface UserDTO {
  id: string;
  twitterHandle?: string;
  name?: string;
  avatarUrl?: string;
}

export interface AuctionDTO {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  currentPrice?: number;
  currency: string;
  artItem: {
    id: string;
    name: string;
    imageUrl: string;
  };
  highestBid?: {
    amount: number;
    bidder: UserDTO;
  };
}

export interface BidDTO {
  id: string;
  amount: number;
  currency: string;
  timestamp: string;
  bidder: UserDTO;
}

export interface CampaignDTO {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  collection?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  auctionCount: number;
} 