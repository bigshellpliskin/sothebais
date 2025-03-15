/**
 * Event Types
 * 
 * This file defines TypeScript interfaces for events used in the system.
 * These events are used for communication between services.
 */

// Define keys as string literal types
export type EventTypeKey = 
  // System Events
  | 'SYSTEM_STARTUP' | 'SYSTEM_SHUTDOWN' | 'SYSTEM_ERROR' | 'SYSTEM_WARNING' | 'SYSTEM_INFO'
  | 'SYSTEM_HEALTH' | 'SYSTEM_METRIC' | 'SYSTEM_CONFIG'
  // Auction Events
  | 'AUCTION_START' | 'AUCTION_END' | 'AUCTION_STARTED' | 'AUCTION_ENDED' | 'AUCTION_CANCELLED'
  // Bid Events
  | 'BID_PLACED' | 'BID_ACCEPTED' | 'BID_REJECTED'
  // Stream Events
  | 'STREAM_START' | 'STREAM_END' | 'STREAM_ERROR' | 'STREAM_WARNING' | 'STREAM_INFO'
  | 'STREAM_QUALITY' | 'STREAM_STATE_UPDATE' | 'STREAM_METRICS_UPDATE'
  // Twitter Events
  | 'TWEET_RECEIVED' | 'TWEET_PROCESSED' | 'TWEET_ERROR' | 'TWEET_WARNING' | 'TWEET_INFO'
  // User Events
  | 'USER_CONNECT' | 'USER_DISCONNECT' | 'USER_ACTION' | 'USER_ERROR' | 'USER_WARNING' | 'USER_INFO' | 'USER_PREFERENCE'
  // Service Events
  | 'SERVICE_STARTED' | 'SERVICE_STOPPED' | 'SERVICE_ERROR' | 'SERVICE_WARNING' | 'SERVICE_INFO'
  // Metrics Events
  | 'METRICS_COLLECTED' | 'METRICS_ERROR' | 'METRICS_WARNING' | 'METRICS_INFO'
  // Session Events
  | 'SESSION_START' | 'SESSION_PRE_AUCTION' | 'SESSION_AUCTION' | 'SESSION_POST_AUCTION' | 'SESSION_END'
  // Lot Events
  | 'LOT_START' | 'LOT_END' | 'WINNER_DETERMINED'
  // Price Events
  | 'PRICE_UPDATED' | 'TIMER_UPDATED'
  // Scene Events
  | 'SCENE_UPDATE' | 'SCENE_LOAD' | 'SCENE_UNLOAD' | 'SCENE_ASSET_ADD' | 'SCENE_ASSET_REMOVE' | 'SCENE_ASSET_UPDATE' | 'ASSET_LOADED'
  // State Events
  | 'STATE_STREAM_UPDATE' | 'STATE_SCENE_UPDATE' | 'STATE_PREVIEW_UPDATE'
  // Preview Events
  | 'PREVIEW_CONNECT' | 'PREVIEW_DISCONNECT' | 'PREVIEW_QUALITY_CHANGE' | 'PREVIEW_FRAME'
  // RTMP Events
  | 'RTMP_CONNECTION' | 'RTMP_DISCONNECTION' | 'RTMP_PUBLISH_START' | 'RTMP_PUBLISH_STOP' | 'RTMP_PLAY_START' | 'RTMP_PLAY_STOP'
  // Agent Events
  | 'AGENT_MESSAGE' | 'AGENT_MOOD' | 'AGENT_INTERACTION' | 'AGENT_ASSET' | 'AGENT_MEMORY';

// Event type mapping - maps each event type key to its string value
export const EVENT_TYPES = {
  // System Events
  SYSTEM_STARTUP: 'SYSTEM_STARTUP',
  SYSTEM_SHUTDOWN: 'SYSTEM_SHUTDOWN',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SYSTEM_WARNING: 'SYSTEM_WARNING',
  SYSTEM_INFO: 'SYSTEM_INFO',
  SYSTEM_HEALTH: 'system:health',
  SYSTEM_METRIC: 'system:metric',
  SYSTEM_CONFIG: 'system:config',

  // Auction Events
  AUCTION_START: 'auction:start',
  AUCTION_END: 'auction:end',
  AUCTION_STARTED: 'AUCTION_STARTED',
  AUCTION_ENDED: 'AUCTION_ENDED',
  AUCTION_CANCELLED: 'AUCTION_CANCELLED',

  // Bid Events
  BID_PLACED: 'lot:bid:placed',
  BID_ACCEPTED: 'lot:bid:accepted',
  BID_REJECTED: 'lot:bid:rejected',

  // Stream Events
  STREAM_START: 'stream:start',
  STREAM_END: 'stream:end',
  STREAM_ERROR: 'STREAM_ERROR',
  STREAM_WARNING: 'STREAM_WARNING',
  STREAM_INFO: 'STREAM_INFO',
  STREAM_QUALITY: 'stream:quality',
  STREAM_STATE_UPDATE: 'stream:state:update',
  STREAM_METRICS_UPDATE: 'stream:metrics:update',

  // Twitter Events
  TWEET_RECEIVED: 'TWEET_RECEIVED',
  TWEET_PROCESSED: 'TWEET_PROCESSED',
  TWEET_ERROR: 'TWEET_ERROR',
  TWEET_WARNING: 'TWEET_WARNING',
  TWEET_INFO: 'TWEET_INFO',

  // User Events
  USER_CONNECT: 'user:connect',
  USER_DISCONNECT: 'user:disconnect',
  USER_ACTION: 'USER_ACTION',
  USER_ERROR: 'USER_ERROR',
  USER_WARNING: 'USER_WARNING',
  USER_INFO: 'USER_INFO',
  USER_PREFERENCE: 'user:preference',

  // Service Events
  SERVICE_STARTED: 'SERVICE_STARTED',
  SERVICE_STOPPED: 'SERVICE_STOPPED',
  SERVICE_ERROR: 'SERVICE_ERROR',
  SERVICE_WARNING: 'SERVICE_WARNING',
  SERVICE_INFO: 'SERVICE_INFO',

  // Metrics Events
  METRICS_COLLECTED: 'METRICS_COLLECTED',
  METRICS_ERROR: 'METRICS_ERROR',
  METRICS_WARNING: 'METRICS_WARNING',
  METRICS_INFO: 'METRICS_INFO',

  // Session Events
  SESSION_START: 'session:start',
  SESSION_PRE_AUCTION: 'session:pre_auction',
  SESSION_AUCTION: 'session:auction',
  SESSION_POST_AUCTION: 'session:post_auction',
  SESSION_END: 'session:end',

  // Lot Events
  LOT_START: 'lot:start',
  LOT_END: 'lot:end',
  WINNER_DETERMINED: 'lot:winner',

  // Price Events
  PRICE_UPDATED: 'auction:price:updated',
  TIMER_UPDATED: 'auction:timer:updated',

  // Scene Events
  SCENE_UPDATE: 'stream:scene:update',
  SCENE_LOAD: 'scene:load',
  SCENE_UNLOAD: 'scene:unload',
  SCENE_ASSET_ADD: 'scene:asset:add',
  SCENE_ASSET_REMOVE: 'scene:asset:remove',
  SCENE_ASSET_UPDATE: 'scene:asset:update',
  ASSET_LOADED: 'stream:asset:loaded',

  // State Events
  STATE_STREAM_UPDATE: 'state:stream:update',
  STATE_SCENE_UPDATE: 'state:scene:update',
  STATE_PREVIEW_UPDATE: 'state:preview:update',

  // Preview Events
  PREVIEW_CONNECT: 'preview:connect',
  PREVIEW_DISCONNECT: 'preview:disconnect',
  PREVIEW_QUALITY_CHANGE: 'preview:quality:change',
  PREVIEW_FRAME: 'preview:frame',

  // RTMP Events
  RTMP_CONNECTION: 'rtmp:connection',
  RTMP_DISCONNECTION: 'rtmp:disconnection',
  RTMP_PUBLISH_START: 'rtmp:publish:start',
  RTMP_PUBLISH_STOP: 'rtmp:publish:stop',
  RTMP_PLAY_START: 'rtmp:play:start',
  RTMP_PLAY_STOP: 'rtmp:play:stop',

  // Agent Events
  AGENT_MESSAGE: 'agent:message',
  AGENT_MOOD: 'agent:mood',
  AGENT_INTERACTION: 'agent:interaction',
  AGENT_ASSET: 'agent:asset:request',
  AGENT_MEMORY: 'agent:memory:update'
} as const;

// Export event type values for use in type definitions
export type EventType = typeof EVENT_TYPES[EventTypeKey];

// Define EventSource as a string literal type
export type EventSourceKey = 
  // System Sources
  | 'SYSTEM' | 'CONFIG' | 'SCHEDULER' | 'MONITOR'
  // Service Sources
  | 'AUCTION_ENGINE' | 'STREAM_MANAGER' | 'EVENT_HANDLER' | 'ADMIN_PANEL'
  // External Sources
  | 'TWITTER_API' | 'RTMP_SERVER' | 'REDIS' | 'METRICS';

// Event sources
export const EVENT_SOURCES = {
  // System Sources
  SYSTEM: 'SYSTEM',
  CONFIG: 'CONFIG',
  SCHEDULER: 'SCHEDULER',
  MONITOR: 'MONITOR',

  // Service Sources
  AUCTION_ENGINE: 'AUCTION_ENGINE',
  STREAM_MANAGER: 'STREAM_MANAGER',
  EVENT_HANDLER: 'EVENT_HANDLER',
  ADMIN_PANEL: 'ADMIN_PANEL',

  // External Sources
  TWITTER_API: 'TWITTER_API',
  RTMP_SERVER: 'RTMP_SERVER',
  REDIS: 'REDIS',
  METRICS: 'METRICS'
} as const;

export type EventSource = typeof EVENT_SOURCES[EventSourceKey];

// Connection types
export type ConnectionTypeKey = 
  // System Connections
  | 'INTERNAL' | 'EXTERNAL'
  // Protocol Types
  | 'HTTP' | 'WEBSOCKET' | 'RTMP' | 'REDIS'
  // API Types
  | 'REST' | 'GRAPHQL' | 'GRPC';

export const CONNECTION_TYPES = {
  // System Connections
  INTERNAL: 'INTERNAL',
  EXTERNAL: 'EXTERNAL',
  
  // Protocol Types
  HTTP: 'HTTP',
  WEBSOCKET: 'WEBSOCKET',
  RTMP: 'RTMP',
  REDIS: 'REDIS',
  
  // API Types
  REST: 'REST',
  GRAPHQL: 'GRAPHQL',
  GRPC: 'GRPC'
} as const;

export type ConnectionType = typeof CONNECTION_TYPES[ConnectionTypeKey];

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
  type: typeof EVENT_TYPES.SESSION_START;
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
  type: typeof EVENT_TYPES.SESSION_PRE_AUCTION | typeof EVENT_TYPES.SESSION_AUCTION | typeof EVENT_TYPES.SESSION_POST_AUCTION;
  data: {
    sessionId: string;
    campaignId: string;
    stage: 'PRE_AUCTION' | 'AUCTION' | 'POST_AUCTION';
    startTime: string; // ISO date string
    endTime: string; // ISO date string
  };
}

export interface SessionEndEvent extends BaseEvent {
  type: typeof EVENT_TYPES.SESSION_END;
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
  type: typeof EVENT_TYPES.LOT_START;
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
  type: typeof EVENT_TYPES.LOT_END;
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
  type: typeof EVENT_TYPES.BID_PLACED;
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
  type: typeof EVENT_TYPES.AUCTION_START;
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
  type: typeof EVENT_TYPES.AUCTION_END;
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
  type: typeof EVENT_TYPES.BID_ACCEPTED;
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
  type: typeof EVENT_TYPES.BID_REJECTED;
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
  type: typeof EVENT_TYPES.WINNER_DETERMINED;
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
  type: typeof EVENT_TYPES.PRICE_UPDATED;
  data: {
    auctionId: string;
    currentPrice: string;
    previousPrice?: string;
    timestamp: string; // ISO date string
  };
}

export interface TimerUpdatedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.TIMER_UPDATED;
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
  type: typeof EVENT_TYPES.STREAM_START;
  data: {
    streamId: string;
    auctionId?: string;
    startTime: string; // ISO date string
    platform: string;
    url?: string;
  };
}

export interface StreamEndEvent extends BaseEvent {
  type: typeof EVENT_TYPES.STREAM_END;
  data: {
    streamId: string;
    endTime: string; // ISO date string
    duration: number; // seconds
    viewerCount?: number;
  };
}

export interface StreamErrorEvent extends BaseEvent {
  type: typeof EVENT_TYPES.STREAM_ERROR;
  data: {
    streamId: string;
    errorCode: string;
    errorMessage: string;
    timestamp: string; // ISO date string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

export interface StreamQualityEvent extends BaseEvent {
  type: typeof EVENT_TYPES.STREAM_QUALITY;
  data: {
    streamId: string;
    bitrate: number;
    fps: number;
    resolution: string;
    timestamp: string; // ISO date string
  };
}

export interface SceneUpdateEvent extends BaseEvent {
  type: typeof EVENT_TYPES.SCENE_UPDATE;
  data: {
    streamId: string;
    sceneId: string;
    elements: any[]; // Scene elements
    timestamp: string; // ISO date string
  };
}

export interface AssetLoadedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.ASSET_LOADED;
  data: {
    assetId: string;
    assetType: string;
    assetUrl: string;
    timestamp: string; // ISO date string
  };
}

// Agent Events
export interface AgentMessageEvent extends BaseEvent {
  type: typeof EVENT_TYPES.AGENT_MESSAGE;
  data: {
    agentId: string;
    messageId: string;
    content: string;
    timestamp: string; // ISO date string
    context?: any;
  };
}

export interface AgentMoodEvent extends BaseEvent {
  type: typeof EVENT_TYPES.AGENT_MOOD;
  data: {
    agentId: string;
    mood: string;
    previousMood?: string;
    timestamp: string; // ISO date string
    trigger?: string;
  };
}

export interface AgentInteractionEvent extends BaseEvent {
  type: typeof EVENT_TYPES.AGENT_INTERACTION;
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
  type: typeof EVENT_TYPES.AGENT_ASSET;
  data: {
    agentId: string;
    assetId: string;
    assetType: string;
    mood?: string;
    timestamp: string; // ISO date string
  };
}

export interface AgentMemoryEvent extends BaseEvent {
  type: typeof EVENT_TYPES.AGENT_MEMORY;
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
  type: typeof EVENT_TYPES.USER_CONNECT;
  data: {
    userId: string;
    connectionId: string;
    platform: string;
    timestamp: string; // ISO date string
    deviceInfo?: any;
  };
}

export interface UserDisconnectEvent extends BaseEvent {
  type: typeof EVENT_TYPES.USER_DISCONNECT;
  data: {
    userId: string;
    connectionId: string;
    timestamp: string; // ISO date string
    reason?: string;
  };
}

export interface UserActionEvent extends BaseEvent {
  type: typeof EVENT_TYPES.USER_ACTION;
  data: {
    userId: string;
    actionId: string;
    actionType: string;
    timestamp: string; // ISO date string
    details?: any;
  };
}

export interface UserPreferenceEvent extends BaseEvent {
  type: typeof EVENT_TYPES.USER_PREFERENCE;
  data: {
    userId: string;
    preferences: any;
    timestamp: string; // ISO date string
  };
}

// System Events
export interface SystemHealthEvent extends BaseEvent {
  type: typeof EVENT_TYPES.SYSTEM_HEALTH;
  data: {
    serviceId: string;
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    timestamp: string; // ISO date string
    details?: any;
  };
}

export interface SystemMetricEvent extends BaseEvent {
  type: typeof EVENT_TYPES.SYSTEM_METRIC;
  data: {
    serviceId: string;
    metricName: string;
    metricValue: number;
    timestamp: string; // ISO date string
    unit?: string;
  };
}

export interface SystemErrorEvent extends BaseEvent {
  type: typeof EVENT_TYPES.SYSTEM_ERROR;
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
  type: typeof EVENT_TYPES.SYSTEM_CONFIG;
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