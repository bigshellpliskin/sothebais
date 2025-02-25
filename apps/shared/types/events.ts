/**
 * Event Types
 * 
 * This file defines TypeScript types for events used throughout the system.
 * Events follow a standardized format and are categorized by type.
 */

// Using a namespace to define all our types
namespace EventTypes {
  // Base event interface
  export interface BaseEvent {
    id: string;          // UUID
    timestamp: number;   // Unix timestamp
    type: EventType;     // Event type enum
    source: EventSource; // Source service
    version: string;     // Event schema version
  }

  // Event type categorization
  export enum EventType {
    // Auction Events (auction:*)
    AUCTION_START = 'auction:start',
    AUCTION_END = 'auction:end',
    BID_PLACED = 'auction:bid:placed',
    BID_ACCEPTED = 'auction:bid:accepted',
    BID_REJECTED = 'auction:bid:rejected',
    WINNER_DETERMINED = 'auction:winner',
    PRICE_UPDATED = 'auction:price:updated',
    TIMER_UPDATED = 'auction:timer:updated',
    AUCTION_EXTENDED = 'auction:extended',

    // Stream Events (stream:*)
    STREAM_START = 'stream:start',
    STREAM_END = 'stream:end',
    STREAM_ERROR = 'stream:error',
    STREAM_QUALITY = 'stream:quality',
    SCENE_UPDATE = 'stream:scene:update',
    ASSET_LOADED = 'stream:asset:loaded',
    VIEWER_COUNT = 'stream:viewers:count',

    // Agent Events (agent:*)
    AGENT_MESSAGE = 'agent:message',
    AGENT_MOOD = 'agent:mood',
    AGENT_INTERACTION = 'agent:interaction',
    AGENT_ASSET = 'agent:asset:request',
    AGENT_MEMORY = 'agent:memory:update',
    AGENT_SCENE = 'agent:scene:update',

    // User Events (user:*)
    USER_CONNECT = 'user:connect',
    USER_DISCONNECT = 'user:disconnect',
    USER_ACTION = 'user:action',
    USER_PREFERENCE = 'user:preference',
    USER_AUTHENTICATED = 'user:authenticated',

    // Campaign Events (campaign:*)
    CAMPAIGN_START = 'campaign:start',
    CAMPAIGN_END = 'campaign:end',
    CAMPAIGN_DAY = 'campaign:day:change',
    CAMPAIGN_UPDATE = 'campaign:update',

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
      endTime: string; // ISO date string
      winningBidId?: string;
      finalPrice?: string;
      status: 'COMPLETED' | 'CANCELLED' | 'NO_BIDS';
    };
  }

  export interface BidPlacedEvent extends BaseEvent {
    type: EventType.BID_PLACED;
    data: {
      bidId: string;
      auctionId: string;
      userId: string;
      twitterHandle?: string;
      amount: string;
      currency: string;
      timestamp: string; // ISO date string
    };
  }

  export interface BidAcceptedEvent extends BaseEvent {
    type: EventType.BID_ACCEPTED;
    data: {
      bidId: string;
      auctionId: string;
      userId: string;
      amount: string;
      isHighestBid: boolean;
      previousHighestBidId?: string;
    };
  }

  export interface BidRejectedEvent extends BaseEvent {
    type: EventType.BID_REJECTED;
    data: {
      bidId: string;
      auctionId: string;
      userId: string;
      amount: string;
      reason: 'TOO_LOW' | 'AUCTION_ENDED' | 'INVALID_USER' | 'SYSTEM_ERROR' | 'OTHER';
      message?: string;
    };
  }

  export interface WinnerDeterminedEvent extends BaseEvent {
    type: EventType.WINNER_DETERMINED;
    data: {
      auctionId: string;
      bidId: string;
      userId: string;
      twitterHandle?: string;
      amount: string;
      currency: string;
      artItemId: string;
    };
  }

  // Stream Events
  export interface StreamStartEvent extends BaseEvent {
    type: EventType.STREAM_START;
    data: {
      streamId: string;
      auctionId?: string;
      startTime: string; // ISO date string
      twitterStreamId?: string;
      rtmpUrl?: string;
    };
  }

  export interface StreamEndEvent extends BaseEvent {
    type: EventType.STREAM_END;
    data: {
      streamId: string;
      endTime: string; // ISO date string
      duration: number; // seconds
      reason?: string;
    };
  }

  export interface StreamErrorEvent extends BaseEvent {
    type: EventType.STREAM_ERROR;
    data: {
      streamId: string;
      error: string;
      errorCode?: string;
      timestamp: string; // ISO date string
      recoverable: boolean;
    };
  }

  export interface SceneUpdateEvent extends BaseEvent {
    type: EventType.SCENE_UPDATE;
    data: {
      streamId: string;
      sceneId: string;
      updateType: 'FULL' | 'PARTIAL';
      layout?: any; // Full layout or partial update
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
      replyToId?: string;
      twitterHandle?: string;
      timestamp: string; // ISO date string
    };
  }

  export interface AgentMoodEvent extends BaseEvent {
    type: EventType.AGENT_MOOD;
    data: {
      agentId: string;
      mood: string;
      intensity: number;
      previousMood?: string;
      trigger: string;
      timestamp: string; // ISO date string
    };
  }

  export interface AgentSceneEvent extends BaseEvent {
    type: EventType.AGENT_SCENE;
    data: {
      agentId: string;
      expression: string;
      background?: string;
      props?: string[];
      timestamp: string; // ISO date string
    };
  }

  // User Events
  export interface UserConnectEvent extends BaseEvent {
    type: EventType.USER_CONNECT;
    data: {
      userId?: string;
      sessionId: string;
      connectionType: 'WEB' | 'TWITTER' | 'API';
      timestamp: string; // ISO date string
      clientInfo?: {
        ip?: string;
        userAgent?: string;
        location?: string;
      };
    };
  }

  export interface UserDisconnectEvent extends BaseEvent {
    type: EventType.USER_DISCONNECT;
    data: {
      userId?: string;
      sessionId: string;
      connectionType: 'WEB' | 'TWITTER' | 'API';
      timestamp: string; // ISO date string
      duration: number; // seconds
    };
  }

  // System Events
  export interface SystemHealthEvent extends BaseEvent {
    type: EventType.SYSTEM_HEALTH;
    data: {
      service: string;
      status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
      timestamp: string; // ISO date string
      details?: {
        checks: Array<{
          name: string;
          status: 'PASS' | 'WARN' | 'FAIL';
          message?: string;
        }>;
      };
    };
  }

  export interface SystemErrorEvent extends BaseEvent {
    type: EventType.SYSTEM_ERROR;
    data: {
      service: string;
      errorCode: string;
      message: string;
      stack?: string;
      timestamp: string; // ISO date string
      context?: Record<string, any>;
    };
  }

  // Union type of all events
  export type Event =
    | AuctionStartEvent
    | AuctionEndEvent
    | BidPlacedEvent
    | BidAcceptedEvent
    | BidRejectedEvent
    | WinnerDeterminedEvent
    | StreamStartEvent
    | StreamEndEvent
    | StreamErrorEvent
    | SceneUpdateEvent
    | AgentMessageEvent
    | AgentMoodEvent
    | AgentSceneEvent
    | UserConnectEvent
    | UserDisconnectEvent
    | SystemHealthEvent
    | SystemErrorEvent;
}

// Export the namespace
export = EventTypes; 