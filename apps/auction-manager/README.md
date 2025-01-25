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
   - [x] Set up Node.js environment with TypeScript
   - [x] Install Redis and configure for development
   - [x] Set up Docker containers for local testing
   - [x] Configure ESLint and Prettier
   - [ ] Set up Jest for testing framework

2. **Redis Schema Design & Implementation**
   - [x] Design Redis key structure for auction data
     - [x] `auction:{marathonId}:config` - Marathon configuration
     - [x] `auction:{marathonId}:current` - Current auction state
     - [x] `auction:{marathonId}:day:{dayNum}` - Daily auction data
     - [x] `auction:bids:{auctionId}` - Bid history sorted set
     - [x] `users:{userId}:bids` - User bid history
   - [x] Implement Redis connection pool
   - [ ] Create Redis health check system
   - [ ] Set up backup and recovery procedures

3. **Auction State Machine**
   - [x] Define state transition rules:
     ```
     PENDING → ACTIVE → PROCESSING → COMPLETED
            ↑                            |
            └────────────────────────────┘
     ```
   - [x] Implement state persistence in Redis
   - [ ] Create state transition validators
   - [x] Set up state change event emitters

4. **Configuration Management**
   - [x] Create configuration file structure
   - [x] Implement environment-based config loading
   - [ ] Set up secure credential management
   - [ ] Create configuration validation system

### Phase 2: Bid Processing Implementation

1. **Twitter Integration Setup**
   - [ ] Set up Twitter API credentials
   - [ ] Configure webhook endpoints for bid tweets
   - [ ] Implement rate limiting and backoff strategy
   - [ ] Create tweet format validation rules:
     - [ ] Must contain auction hashtag
     - [ ] Must contain bid amount in ETH
     - [ ] Must be a reply to auction tweet

2. **Bid Queue System**
   - [x] Set up basic bid processing
   - [ ] Configure Redis for queue backend
   - [ ] Implement queue monitoring
   - [ ] Create dead letter queue for failed bids
   - [ ] Set up retry strategies:
     - [ ] Maximum 3 retries
     - [ ] Exponential backoff
     - [ ] Alert on consistent failures

3. **Bid Validation System**
   - [x] Implement bid amount validation
     - [x] Check minimum increment
     - [x] Verify against current highest bid
     - [x] Convert currency representations
   - [ ] Create user validation system
     - [ ] Check user eligibility
     - [ ] Verify account age > 1 month
     - [ ] Check previous bid history
   - [ ] Set up bid conflict resolution
     - [ ] Timestamp-based resolution
     - [ ] Network latency compensation
     - [ ] Concurrent bid handling

### Phase 3: Integration Implementation

1. **ElizaOS Integration**
   - [ ] Set up message queue for ElizaOS communication
   - [ ] Define character interaction events:
     - [ ] Bid acknowledgments
     - [ ] Price updates
     - [ ] Auction status changes
     - [ ] Winner announcements
   - [ ] Implement fallback responses
   - [ ] Create rate limiting for character responses

2. **Livestream Manager Integration**
   - [ ] Set up WebSocket connection for real-time updates
   - [ ] Define update message formats:
     - [ ] Bid updates
     - [ ] Timer updates
     - [ ] Visual state changes
   - [ ] Implement heartbeat system
   - [ ] Create reconnection strategy

3. **Shape L2 Integration**
   - [ ] Set up blockchain node connection
   - [ ] Implement contract event listeners:
     - [ ] Transfer events
     - [ ] Approval events
     - [ ] Sale completion
   - [ ] Create transaction verification system
   - [ ] Implement gas price management
   - [ ] Set up block confirmation tracking

### Phase 4: Testing & Monitoring

1. **Monitoring Setup**
   - [x] Configure basic Prometheus metrics
   - [ ] Set up detailed metrics:
     - [ ] Bid processing time
     - [ ] Queue lengths
     - [ ] State transitions
     - [ ] Error rates
     - [ ] Integration latencies
   - [ ] Set up Grafana dashboards
   - [ ] Configure alerting rules
   - [ ] Create on-call rotation

2. **Testing Infrastructure**
   - [ ] Create test environments:
     - [ ] Local development
     - [ ] Staging
     - [ ] Production simulation
   - [ ] Set up integration test suite
   - [ ] Create load testing scenarios:
     - [ ] Normal operation
     - [ ] High bid volume
     - [ ] Network latency
     - [ ] Component failures

3. **Recovery Systems**
   - [ ] Implement automatic failover:
     - [ ] Redis sentinel configuration
     - [ ] Leader election system
     - [ ] State recovery procedures
   - [ ] Create backup systems:
     - [ ] Hourly state snapshots
     - [ ] Transaction logs
     - [ ] Bid history archives
   - [ ] Document recovery procedures
```