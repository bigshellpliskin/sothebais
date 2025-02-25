/**
 * Redis Data Models
 * 
 * This file defines TypeScript interfaces for data stored in Redis.
 * These models represent the structure of data that will be serialized to JSON
 * and stored in Redis.
 */

// Using a namespace to define all our Redis models
namespace RedisModels {
  // Campaign State Models
  export interface CampaignState {
    id: string;
    name: string;
    startDate: string; // ISO date string
    endDate: string; // ISO date string
    status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    currentDay: number;
    totalDays: number;
    currentAuctionId?: string;
  }

  export interface CampaignDayState {
    campaignId: string;
    day: number;
    date: string; // ISO date string
    auctionIds: string[];
    completed: boolean;
  }

  // Auction State Models
  export interface AuctionState {
    id: string;
    campaignId?: string;
    artItemId: string;
    status: 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'SETTLED' | 'CANCELLED';
    startTime: string; // ISO date string
    endTime: string; // ISO date string
    extendedEndTime?: string; // ISO date string (if auction was extended)
    reservePrice?: string; // Decimal string (e.g. "1.5")
    minBidIncrement?: string; // Decimal string (e.g. "0.1")
    currency: string; // e.g. "ETH"
    highestBidId?: string;
    streamId?: string;
  }

  export interface AuctionPrice {
    auctionId: string;
    currentPrice: string; // Decimal string (e.g. "1.5")
    previousPrice?: string; // Decimal string
    lastUpdateTime: string; // ISO date string
  }

  export interface AuctionBid {
    id: string;
    auctionId: string;
    userId: string;
    twitterHandle?: string;
    walletAddress?: string;
    amount: string; // Decimal string (e.g. "1.5")
    currency: string; // e.g. "ETH"
    timestamp: string; // ISO date string
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WINNING';
    transactionHash?: string;
  }

  export interface AuctionTimer {
    auctionId: string;
    startTime: string; // ISO date string
    endTime: string; // ISO date string
    currentTime: string; // ISO date string
    timeRemaining: number; // seconds
    isExtended: boolean;
    extensionCount: number;
  }

  // Stream State Models
  export interface StreamState {
    id: string;
    auctionId?: string;
    status: 'INITIALIZING' | 'LIVE' | 'PAUSED' | 'ENDED' | 'ERROR';
    startTime?: string; // ISO date string
    endTime?: string; // ISO date string
    error?: string;
    twitterStreamId?: string;
    rtmpUrl?: string;
    viewerCount: number;
    currentSceneId?: string;
  }

  export interface StreamScene {
    id: string;
    streamId: string;
    name: string;
    layout: {
      quadrants: Array<{
        id: string;
        type: 'CHARACTER' | 'NFT' | 'BID_HISTORY' | 'TIMER' | 'EMPTY';
        content?: string; // Asset path or content identifier
        visible: boolean;
        zIndex: number;
        position: {
          x: number;
          y: number;
          width: number;
          height: number;
        };
      }>;
      overlays: Array<{
        id: string;
        type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'GRAPHIC';
        content: string;
        visible: boolean;
        zIndex: number;
        position: {
          x: number;
          y: number;
          width: number;
          height: number;
        };
      }>;
      background?: string; // Background asset path
    };
  }

  export interface StreamMetrics {
    streamId: string;
    timestamp: string; // ISO date string
    fps: number;
    targetFps: number;
    bitrate: number;
    droppedFrames: number;
    encoderLatency: number;
    bufferHealth: number;
    cpuUsage: number;
    memoryUsage: number;
  }

  // Agent State Models
  export interface AgentState {
    id: string;
    characterId: string;
    name: string;
    status: 'INITIALIZING' | 'ACTIVE' | 'PAUSED' | 'INACTIVE';
    streamId?: string;
    auctionId?: string;
    lastInteractionTime?: string; // ISO date string
  }

  export interface AgentMood {
    agentId: string;
    currentMood: 'NEUTRAL' | 'EXCITED' | 'HAPPY' | 'SURPRISED' | 'CURIOUS' | 'CONCERNED' | 'DISAPPOINTED';
    intensity: number; // 0-100
    previousMood?: string;
    moodStartTime: string; // ISO date string
    triggers: string[]; // What caused this mood
  }

  export interface AgentContext {
    agentId: string;
    auctionContext?: {
      auctionId: string;
      artItemName: string;
      currentPrice: string;
      timeRemaining: number;
      bidCount: number;
      highestBidder?: string;
    };
    conversationContext: {
      recentMessages: Array<{
        role: 'agent' | 'user';
        content: string;
        timestamp: string; // ISO date string
        twitterHandle?: string;
      }>;
      topic?: string;
      sentiment?: string;
    };
    memoryKeys: string[]; // References to long-term memory in PostgreSQL
  }

  export interface AgentScene {
    agentId: string;
    currentExpression: string; // Path to expression asset
    background?: string; // Path to background asset
    props: string[]; // Paths to prop assets
    lastChanged: string; // ISO date string
  }

  // System Models
  export interface Lock {
    resource: string;
    owner: string;
    acquiredAt: string; // ISO date string
    expiresAt: string; // ISO date string
    metadata?: Record<string, any>;
  }

  export interface RateLimit {
    resource: string;
    identifier: string; // IP, user ID, etc.
    count: number;
    resetAt: string; // ISO date string
    limit: number;
  }

  export interface Session {
    id: string;
    userId: string;
    createdAt: string; // ISO date string
    expiresAt: string; // ISO date string
    data: Record<string, any>;
  }

  export interface Cache {
    key: string;
    value: any;
    createdAt: string; // ISO date string
    expiresAt?: string; // ISO date string
  }
}

// Export the namespace
export = RedisModels; 