/**
 * Event Types
 * 
 * This file defines TypeScript interfaces for events used in the system.
 * These events are used for communication between services.
 */

// Event type categorization
export enum EventType {
  // Auction Session Events (session:*)
  SESSION_START = 'session:start',
  SESSION_PRE_AUCTION = 'session:pre_auction',
  SESSION_AUCTION = 'session:auction',
  SESSION_POST_AUCTION = 'session:post_auction',
  SESSION_END = 'session:end',
  
  // Lot/Auction Events (lot:*)
  LOT_START = 'lot:start',
  LOT_END = 'lot:end',
  BID_PLACED = 'lot:bid:placed',
  BID_ACCEPTED = 'lot:bid:accepted',
  BID_REJECTED = 'lot:bid:rejected',
  WINNER_DETERMINED = 'lot:winner',

  // Auction Events (auction:*)
  AUCTION_START = 'auction:start',
  AUCTION_END = 'auction:end',
  PRICE_UPDATED = 'auction:price:updated',
  TIMER_UPDATED = 'auction:timer:updated',

  // Stream Events (stream:*)
  STREAM_START = 'stream:start',
  STREAM_END = 'stream:end',
  STREAM_ERROR = 'stream:error',
  STREAM_QUALITY = 'stream:quality',
  SCENE_UPDATE = 'stream:scene:update',
  ASSET_LOADED = 'stream:asset:loaded',

  // Agent Events (agent:*)
  AGENT_MESSAGE = 'agent:message',
  AGENT_MOOD = 'agent:mood',
  AGENT_INTERACTION = 'agent:interaction',
  AGENT_ASSET = 'agent:asset:request',
  AGENT_MEMORY = 'agent:memory:update',

  // User Events (user:*)
  USER_CONNECT = 'user:connect',
  USER_DISCONNECT = 'user:disconnect',
  USER_ACTION = 'user:action',
  USER_PREFERENCE = 'user:preference',

  // System Events (system:*)
  SYSTEM_HEALTH = 'system:health',
  SYSTEM_METRIC = 'system:metric',
  SYSTEM_ERROR = 'system:error',
  SYSTEM_CONFIG = 'system:config'
}

// Event source identification
export enum EventSource {
  AUCTION_ENGINE = 'auction-engine',
  STREAM_MANAGER = 'stream-manager',
  AGENT_SERVICE = 'agent-service',
  EVENT_HANDLER = 'event-handler',
  ADMIN_FRONTEND = 'admin-frontend'
}

// Base event interface
export interface BaseEvent {
  id: string;          // UUID
  timestamp: number;   // Unix timestamp
  type: EventType;     // Event type enum
  source: EventSource; // Source service
  version: string;     // Event schema version
}

// Auction Session Events
export interface SessionStartEvent extends BaseEvent {
  type: EventType.SESSION_START;
  data: {
    sessionId: string;
    campaignId: string;
    sessionDate: string; // ISO date string
    preAuctionStartTime: string; // ISO date string
    preAuctionEndTime: string; // ISO date string
    auctionStartTime: string; // ISO date string
    auctionEndTime: string; // ISO date string
    postAuctionStartTime: string; // ISO date string
    postAuctionEndTime: string; // ISO date string
    streamKey?: string;
  };
}

export interface SessionStageChangeEvent extends BaseEvent {
  type: EventType.SESSION_PRE_AUCTION | EventType.SESSION_AUCTION | EventType.SESSION_POST_AUCTION;
  data: {
    sessionId: string;
    campaignId: string;
    stage: 'PRE_AUCTION' | 'AUCTION' | 'POST_AUCTION';
    startTime: string; // ISO date string
    endTime: string; // ISO date string
  };
}

export interface SessionEndEvent extends BaseEvent {
  type: EventType.SESSION_END;
  data: {
    sessionId: string;
    campaignId: string;
    totalLots: number;
    completedLots: number;
    totalBids: number;
    totalValue: string; // Decimal string
    currency: string;
  };
}

// Lot/Auction Events
export interface LotStartEvent extends BaseEvent {
  type: EventType.LOT_START;
  data: {
    lotId: string;
    sessionId: string;
    artItemId: string;
    startTime: string; // ISO date string
    endTime: string; // ISO date string
    reservePrice?: string;
    currency: string;
    lotOrder: number;
  };
}

export interface LotEndEvent extends BaseEvent {
  type: EventType.LOT_END;
  data: {
    lotId: string;
    sessionId: string;
    artItemId: string;
    endTime: string; // ISO date string
    finalPrice?: string;
    currency: string;
    winnerId?: string;
    winningBidId?: string;
    lotOrder: number;
  };
}

export interface BidPlacedEvent extends BaseEvent {
  type: EventType.BID_PLACED;
  data: {
    bidId: string;
    lotId: string;
    sessionId: string;
    userId: string;
    amount: string; // Decimal string
    currency: string;
    timestamp: string; // ISO date string
  };
}

// Auction Events
export interface AuctionStartEvent extends BaseEvent {
  type: EventType.AUCTION_START;
  data: {
    auctionId: string;
    campaignId?: string;
    artItemId: string;
    startTime: string; // ISO date string
    endTime: string; // ISO date string
    reservePrice?: string;
    currency: string;
  };
}

export interface AuctionEndEvent extends BaseEvent {
  type: EventType.AUCTION_END;
  data: {
    auctionId: string;
    campaignId?: string;
    artItemId: string;
    endTime: string; // ISO date string
    finalPrice?: string;
    currency: string;
    winnerId?: string;
  };
}

export interface BidAcceptedEvent extends BaseEvent {
  type: EventType.BID_ACCEPTED;
  data: {
    bidId: string;
    auctionId: string;
    userId: string;
    amount: string;
    currency: string;
    timestamp: string; // ISO date string
    isHighestBid: boolean;
  };
}

export interface BidRejectedEvent extends BaseEvent {
  type: EventType.BID_REJECTED;
  data: {
    bidId: string;
    auctionId: string;
    userId: string;
    amount: string;
    currency: string;
    timestamp: string; // ISO date string
    reason: string;
  };
}

export interface WinnerDeterminedEvent extends BaseEvent {
  type: EventType.WINNER_DETERMINED;
  data: {
    auctionId: string;
    bidId: string;
    userId: string;
    amount: string;
    currency: string;
    timestamp: string; // ISO date string
  };
}

export interface PriceUpdatedEvent extends BaseEvent {
  type: EventType.PRICE_UPDATED;
  data: {
    auctionId: string;
    currentPrice: string;
    previousPrice?: string;
    timestamp: string; // ISO date string
  };
}

export interface TimerUpdatedEvent extends BaseEvent {
  type: EventType.TIMER_UPDATED;
  data: {
    auctionId: string;
    timeRemaining: number; // seconds
    isExtended: boolean;
    extensionCount: number;
    timestamp: string; // ISO date string
  };
}

// Stream Events
export interface StreamStartEvent extends BaseEvent {
  type: EventType.STREAM_START;
  data: {
    streamId: string;
    auctionId?: string;
    startTime: string; // ISO date string
    platform: string;
    url?: string;
  };
}

export interface StreamEndEvent extends BaseEvent {
  type: EventType.STREAM_END;
  data: {
    streamId: string;
    endTime: string; // ISO date string
    duration: number; // seconds
    viewerCount?: number;
  };
}

export interface StreamErrorEvent extends BaseEvent {
  type: EventType.STREAM_ERROR;
  data: {
    streamId: string;
    errorCode: string;
    errorMessage: string;
    timestamp: string; // ISO date string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

export interface StreamQualityEvent extends BaseEvent {
  type: EventType.STREAM_QUALITY;
  data: {
    streamId: string;
    bitrate: number;
    fps: number;
    resolution: string;
    timestamp: string; // ISO date string
  };
}

export interface SceneUpdateEvent extends BaseEvent {
  type: EventType.SCENE_UPDATE;
  data: {
    streamId: string;
    sceneId: string;
    elements: any[]; // Scene elements
    timestamp: string; // ISO date string
  };
}

export interface AssetLoadedEvent extends BaseEvent {
  type: EventType.ASSET_LOADED;
  data: {
    assetId: string;
    assetType: string;
    assetUrl: string;
    timestamp: string; // ISO date string
  };
}

// Agent Events
export interface AgentMessageEvent extends BaseEvent {
  type: EventType.AGENT_MESSAGE;
  data: {
    agentId: string;
    messageId: string;
    content: string;
    timestamp: string; // ISO date string
    context?: any;
  };
}

export interface AgentMoodEvent extends BaseEvent {
  type: EventType.AGENT_MOOD;
  data: {
    agentId: string;
    mood: string;
    previousMood?: string;
    timestamp: string; // ISO date string
    trigger?: string;
  };
}

export interface AgentInteractionEvent extends BaseEvent {
  type: EventType.AGENT_INTERACTION;
  data: {
    agentId: string;
    interactionId: string;
    userId?: string;
    twitterHandle?: string;
    content: string;
    timestamp: string; // ISO date string
    type: 'QUESTION' | 'COMMENT' | 'BID' | 'OTHER';
  };
}

export interface AgentAssetEvent extends BaseEvent {
  type: EventType.AGENT_ASSET;
  data: {
    agentId: string;
    assetId: string;
    assetType: string;
    mood?: string;
    timestamp: string; // ISO date string
  };
}

export interface AgentMemoryEvent extends BaseEvent {
  type: EventType.AGENT_MEMORY;
  data: {
    agentId: string;
    memoryId: string;
    content: any;
    timestamp: string; // ISO date string
    type: 'SHORT_TERM' | 'LONG_TERM';
  };
}

// User Events
export interface UserConnectEvent extends BaseEvent {
  type: EventType.USER_CONNECT;
  data: {
    userId: string;
    connectionId: string;
    platform: string;
    timestamp: string; // ISO date string
    deviceInfo?: any;
  };
}

export interface UserDisconnectEvent extends BaseEvent {
  type: EventType.USER_DISCONNECT;
  data: {
    userId: string;
    connectionId: string;
    timestamp: string; // ISO date string
    reason?: string;
  };
}

export interface UserActionEvent extends BaseEvent {
  type: EventType.USER_ACTION;
  data: {
    userId: string;
    actionId: string;
    actionType: string;
    timestamp: string; // ISO date string
    details?: any;
  };
}

export interface UserPreferenceEvent extends BaseEvent {
  type: EventType.USER_PREFERENCE;
  data: {
    userId: string;
    preferences: any;
    timestamp: string; // ISO date string
  };
}

// System Events
export interface SystemHealthEvent extends BaseEvent {
  type: EventType.SYSTEM_HEALTH;
  data: {
    serviceId: string;
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    timestamp: string; // ISO date string
    details?: any;
  };
}

export interface SystemMetricEvent extends BaseEvent {
  type: EventType.SYSTEM_METRIC;
  data: {
    serviceId: string;
    metricName: string;
    metricValue: number;
    timestamp: string; // ISO date string
    unit?: string;
  };
}

export interface SystemErrorEvent extends BaseEvent {
  type: EventType.SYSTEM_ERROR;
  data: {
    serviceId: string;
    errorCode: string;
    errorMessage: string;
    timestamp: string; // ISO date string
    stackTrace?: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

export interface SystemConfigEvent extends BaseEvent {
  type: EventType.SYSTEM_CONFIG;
  data: {
    serviceId: string;
    configKey: string;
    configValue: any;
    timestamp: string; // ISO date string
  };
}

// Union type of all events
export type Event =
  | SessionStartEvent
  | SessionStageChangeEvent
  | SessionEndEvent
  | LotStartEvent
  | LotEndEvent
  | BidPlacedEvent
  | AuctionStartEvent
  | AuctionEndEvent
  | BidAcceptedEvent
  | BidRejectedEvent
  | WinnerDeterminedEvent
  | PriceUpdatedEvent
  | TimerUpdatedEvent
  | StreamStartEvent
  | StreamEndEvent
  | StreamErrorEvent
  | StreamQualityEvent
  | SceneUpdateEvent
  | AssetLoadedEvent
  | AgentMessageEvent
  | AgentMoodEvent
  | AgentInteractionEvent
  | AgentAssetEvent
  | AgentMemoryEvent
  | UserConnectEvent
  | UserDisconnectEvent
  | UserActionEvent
  | UserPreferenceEvent
  | SystemHealthEvent
  | SystemMetricEvent
  | SystemErrorEvent
  | SystemConfigEvent; 