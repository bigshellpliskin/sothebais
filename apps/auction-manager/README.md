# Auction Manager

## Project Summary
The Auction Manager is the core orchestration system for the NFT auction platform. It controls the auction lifecycle, processes bids, and coordinates between various system components to ensure smooth operation of the daily NFT auctions.

### Key Responsibilities
- Manage auction lifecycle and scheduling
- Process and validate bids from Twitter
- Coordinate with ElizaOS for stream interactions
- Interface with Shape L2 for blockchain operations
- Maintain auction state via Redis
- Drive the Livestream Manager for visual output

## System Requirements

### Auction Lifecycle
- Support configurable auction marathon duration (e.g., 30 days)
- Handle daily auction windows with configurable start/end times
- Maintain consistent timezone handling (EST)
- Track auction states: PENDING, ACTIVE, PROCESSING, COMPLETED

### Bid Processing
- Monitor incoming bids via Event Handler
- Validate bid format and amounts
- Track highest bidder and bid history
- Handle bid cancellations/invalidations
- Ensure atomic bid processing

### System Integration
- Coordinate with ElizaOS for character interactions
- Trigger Livestream Manager updates
- Monitor Shape L2 contract states
- Maintain Redis state consistency

## Implementation Plan

### Phase 1: Core Infrastructure Setup

1. **Development Environment Setup**
   - Set up Node.js environment with TypeScript
   - Install Redis and configure for development
   - Set up Docker containers for local testing
   - Configure ESLint and Prettier
   - Set up Jest for testing framework

2. **Redis Schema Design & Implementation**
   - Design Redis key structure for auction data
     - `auction:{marathonId}:config` - Marathon configuration
     - `auction:{marathonId}:current` - Current auction state
     - `auction:{marathonId}:day:{dayNum}` - Daily auction data
     - `auction:bids:{auctionId}` - Bid history sorted set
     - `users:{userId}:bids` - User bid history
   - Implement Redis connection pool
   - Create Redis health check system
   - Set up backup and recovery procedures

3. **Auction State Machine**
   - Define state transition rules:
     ```
     PENDING → ACTIVE → PROCESSING → COMPLETED
            ↑                            |
            └────────────────────────────┘
     ```
   - Implement state persistence in Redis
   - Create state transition validators
   - Set up state change event emitters

4. **Configuration Management**
   - Create configuration file structure
   - Implement environment-based config loading
   - Set up secure credential management
   - Create configuration validation system

### Phase 2: Bid Processing Implementation

1. **Twitter Integration Setup**
   - Set up Twitter API credentials
   - Configure webhook endpoints for bid tweets
   - Implement rate limiting and backoff strategy
   - Create tweet format validation rules:
     - Must contain auction hashtag
     - Must contain bid amount in ETH
     - Must be a reply to auction tweet

2. **Bid Queue System**
   - Set up Bull queue for bid processing
   - Configure Redis for queue backend
   - Implement queue monitoring
   - Create dead letter queue for failed bids
   - Set up retry strategies:
     - Maximum 3 retries
     - Exponential backoff
     - Alert on consistent failures

3. **Bid Validation System**
   - Implement bid amount validation
     - Check minimum increment
     - Verify against current highest bid
     - Convert currency representations
   - Create user validation system
     - Check user eligibility
     - Verify account age > 1 month
     - Check previous bid history
   - Set up bid conflict resolution
     - Timestamp-based resolution
     - Network latency compensation
     - Concurrent bid handling

### Phase 3: Integration Implementation

1. **ElizaOS Integration**
   - Set up message queue for ElizaOS communication
   - Define character interaction events:
     - Bid acknowledgments
     - Price updates
     - Auction status changes
     - Winner announcements
   - Implement fallback responses
   - Create rate limiting for character responses

2. **Livestream Manager Integration**
   - Set up WebSocket connection for real-time updates
   - Define update message formats:
     - Bid updates
     - Timer updates
     - Visual state changes
   - Implement heartbeat system
   - Create reconnection strategy

3. **Shape L2 Integration**
   - Set up blockchain node connection
   - Implement contract event listeners:
     - Transfer events
     - Approval events
     - Sale completion
   - Create transaction verification system
   - Implement gas price management
   - Set up block confirmation tracking

### Phase 4: Testing & Monitoring

1. **Monitoring Setup**
   - Configure Prometheus metrics:
     - Bid processing time
     - Queue lengths
     - State transitions
     - Error rates
     - Integration latencies
   - Set up Grafana dashboards
   - Configure alerting rules
   - Create on-call rotation

2. **Testing Infrastructure**
   - Create test environments:
     - Local development
     - Staging
     - Production simulation
   - Set up integration test suite
   - Create load testing scenarios:
     - Normal operation
     - High bid volume
     - Network latency
     - Component failures

3. **Recovery Systems**
   - Implement automatic failover:
     - Redis sentinel configuration
     - Leader election system
     - State recovery procedures
   - Create backup systems:
     - Hourly state snapshots
     - Transaction logs
     - Bid history archives
   - Document recovery procedures

## API Design

### Internal APIs
```typescript
interface AuctionManager {
  // Lifecycle Management
  startAuctionMarathon(config: MarathonConfig): Promise<void>;
  startDailyAuction(): Promise<void>;
  endDailyAuction(): Promise<void>;
  
  // Bid Processing
  processBid(bid: TwitterBid): Promise<BidResult>;
  validateBid(bid: TwitterBid): Promise<boolean>;
  updateHighestBid(bid: TwitterBid): Promise<void>;
  
  // State Management
  getAuctionState(): Promise<AuctionState>;
  updateAuctionState(state: Partial<AuctionState>): Promise<void>;
  
  // Integration Handlers
  notifyElizaOS(event: AuctionEvent): Promise<void>;
  updateLivestream(state: AuctionState): Promise<void>;
  handleContractEvent(event: ContractEvent): Promise<void>;
}

interface MarathonConfig {
  durationDays: number;
  dailyStartTime: string; // ISO time
  dailyEndTime: string;   // ISO time
  timezone: string;
}

interface AuctionState {
  status: 'PENDING' | 'ACTIVE' | 'PROCESSING' | 'COMPLETED';
  currentBid: Bid | null;
  bidHistory: Bid[];
  startTime: Date;
  endTime: Date;
}
```

### Event Types
```typescript
interface AuctionEvent {
  type: 'BID_RECEIVED' | 'BID_ACCEPTED' | 'BID_REJECTED' | 'AUCTION_START' | 'AUCTION_END';
  data: any;
  timestamp: Date;
}

interface TwitterBid {
  userId: string;
  tweetId: string;
  amount: number;
  timestamp: Date;
  rawContent: string;
}

interface ContractEvent {
  type: 'TRANSFER' | 'APPROVAL' | 'SALE_COMPLETE';
  data: any;
  blockNumber: number;
}
```

## Configuration Example
```yaml
auction:
  marathon:
    duration_days: 30
    daily_window:
      start_time: "15:00"  # 3 PM EST
      end_time: "16:00"    # 4 PM EST
    timezone: "America/New_York"
  
  bid:
    min_increment: 0.1     # ETH
    processing_timeout: 30  # seconds
    
  integration:
    eliza_os:
      update_interval: 5    # seconds
    livestream:
      state_refresh: 1      # seconds
    shape_l2:
      block_confirmation: 3 # blocks
``` 