# Requirements

## 1. Introduction/Overview
### 1.1. Purpose and Scope

#### 1.1.1. Purpose

SothebAIs is a system that allows users to socially interact with NFT auctions and follow them in real-time on twitter/X.

#### 1.1.2. Scope

The system will be a collection of services that can be hosted on hardware powerful enough to handle livestreaming.

### 1.2. Definitions

#### 1.2.1. Entities
- **Viewer**
    - A twitter/X account that is watching the livestream.
- **Bidder**
    - A twitter/X account with an assocated wallet address and at least one bid.
- **Auction Host**
    - The twitter/X account and associated character that is hosting the auction.
- **Campaign**
    - A series of regularly scheduled Auctions to sell a collection of art items.
- **Project**
    - The group behind/associated with the art items to be auctioned.
- **Collection**
    - The set/collection of art items to be auctioned.
- **Art Item**
    - A single item from the collection that is being auctioned.

#### 1.2.2. Events
- **Campaign**
    - A series of regularly scheduled Auctions.

    | Parameters    | Example                |
    |:-------------|:--------------------|
    | Name         | Summer NFT Series   |
    | Start Date   | 2024-06-01         |
    | End Date     | 2024-08-31         |
    | Auction Interval | 2 hours        |
    | Project      | Digital Art Collection |
- **Pre-Auction**
    - Section of the campaign that occurs before the auction starts.
    - Used to send announcements and publicize the auction.
- **Auction**
    - A timed-event held on a livestream that at least one art items that are being auctioned.
    
    | Parameters     | Example                |
    |:--------------|:--------------------|
    | Name          | Genesis #1          |
    | Start Time    | 2024-06-01 14:00 UTC|
    | End Time      | 2024-06-01 16:00 UTC|
    | Art Item      | CryptoPunk #1234    |
    | Starting Price| 1 ETH               |
    | Current Price | 2.5 ETH             |
    | Highest Bidder| @crypto_collector   |
- **Livestream**
    - A livestream that is being hosted on X/Twitter.
    
    | Parameters    | Example                |
    |:-------------|:--------------------|
    | Name         | Genesis Auction #1   |
    | Start Time   | 2024-06-01 13:45 UTC|
    | End Time     | 2024-06-01 16:15 UTC|
    | Auction      | Genesis #1          |

#### 1.2.3. Visual Components
- **Assets**
    - Static assets stored locally or remotely that are used in the the Scene/Render.
- **Scene**
    - High level description of elements.
    - Background, Quadrant, Overlay layers.
    - Quadrant-based scene composition.
    - Assets positioned relative to quadrant bounds.
    - Z-index ordering within quadrants.

- **Composition**
    - Takes the scene data and renders it to an image.
    - Internal data representation to image.
- **Feed**
    - The stream that is generated from the ffmpeg process.
    - Image to Video.
- **Stream**
    - The stream that is send from the RTMP server to the livestreaming platform.

## 2. Functional Requirements
What the system should do.

### 2.1. User Features
Features that users directly interact with or experience.

#### 2.1.1. Livestream Viewing
- Watch the livestream on twitter/X
- See and hear the auction host
- See basic auction info progress live
- View the art item being auctioned
- See current bid amount, highest bidder, and time remaining

#### 2.1.2. Bidding & Participation
- Deposit crypto into an escrow wallet
- Place bids via tweet with transaction/wallet address
- Verify bid reception and processing
- Receive notifications for:
  - Bid acceptance
  - Being outbid
  - Winning an auction
  - Auction ending soon
- View personal bidding history
- Set up alerts for upcoming auctions

#### 2.1.3. Social Interaction
- Interact with auction host
- Receive automated announcements about auctions
- Follow campaign progress

#### 2.1.4. Admin Features
- **Stream Preview & Control**
  - Real-time preview of stream composition
  - Live WebSocket connection to stream manager
  - Scene layout configuration
  - Asset placement and management
  - Stream quality monitoring
  - Test overlays and transitions
  - Audio level monitoring
- **Auction Management**
  - Configure auction parameters
  - Monitor bidding activity
  - Override auction state if needed
  - Emergency stream controls
  - Asset upload and management
- **System Monitoring**
  - View service health status
  - Monitor resource usage
  - Analyze stream performance

### 2.2. System Functions
Core system capabilities and backend functionality.

#### 2.2.1. Identity & Authentication
- Associate Twitter handles with wallet addresses
- Manage user identity verification
- Handle wallet signature verification
- Maintain secure identity associations

#### 2.2.2. Auction Engine
- Process and validate bids
- Enforce auction rules:
  - Minimum bid increments
  - Reserve prices
  - Time extensions
  - Winner determination
- Manage concurrent auctions
- Schedule and queue upcoming auctions
- Handle campaign scheduling

#### 2.2.3. Blockchain Operations
- Interact with EVM chains (Ethereum, Polygon, Base, Shape)
- Verify transaction authenticity
- Manage smart contracts for:
  - Escrow management
  - NFT transfers
  - Payment processing
  - Bid verification

#### 2.2.4. Stream Technical Management
- Control stream quality and performance
- Handle auction transitions
- Manage dynamic overlay updates
- Control automated camera switching
- Maintain stream stability

### 2.3. Data Management
Data storage, persistence, and analytics functionality.

#### 2.3.1. Auction Data
- Store and manage:
  - Bid records (amount, bidder, timestamp, tx hash, status)
  - Auction metadata
  - Start/end times
  - Item information
  - Winning bids
  - Participation statistics

#### 2.3.2. User Data
- Maintain user records:
  - Authentication information
  - Bidding history
  - Notification preferences
  - Wallet addresses
  - Twitter handles
- Ensure data privacy and security

#### 2.3.3. Analytics & Reporting
- Track and store:
  - Viewer statistics
  - Bidding patterns
  - Auction performance metrics
  - User engagement data
- Generate reports for:
  - Daily auction summaries
  - Campaign performance
  - User activity
  - Financial transactions

### 2.4. Scene Management
Visual composition and real-time rendering capabilities.

#### 2.4.1. Layout Management
- Implement quadrant-based composition:
  - 4 fixed quadrants
  - Defined bounds and padding
  - Relative asset positioning
  - Z-index ordering

#### 2.4.2. Asset Management
- Handle multiple asset types:
  - Background elements
  - Quadrant content
  - Overlay elements
- Manage asset loading and caching
- Support dynamic asset updates

#### 2.4.3. Rendering Pipeline
- Maintain consistent frame rate
- Handle scene transitions
- Support real-time updates
- Ensure visual quality standards

## 3. Non-functional Requirements
How the system should perform.

### 3.1. Performance
- Stream Performance
    - Resolution: 1280x720p minimum
    - Frame Rate: 30fps minimum
    - Bitrate: 4-6k kbps
    - Latency: < 10 seconds end-to-end
    - Buffer: < 5 seconds

- System Response Times
    - Bid Processing: < 2 seconds
    - Scene Updates: < 100ms
    - User Interface Updates: < 500ms
    - Notification Delivery: < 5 seconds

- Concurrent Users
    - Support minimum 1000 simultaneous viewers
    - Handle 100 active bidders per auction
    - Process up to 10 bids per minute

### 3.2. Security
- Authentication & Authorization
    - Secure wallet signature verification
    - Two-factor authentication for admin access
    - Rate limiting on bid submissions
    - IP-based request throttling

- Data Protection
    - Encryption at rest for user data
    - Secure communication channels (HTTPS/WSS)
    - Regular security audits
    - Compliance with crypto wallet standards

- Access Control
    - Role-based access control
    - Admin-only auction controls
    - Audit logging of all system actions
    - Session management and timeout

### 3.3. Reliability
- System Uptime
    - 99.9% uptime during active auctions
    - Automated recovery from common failures
    - Graceful degradation under load
    - No single point of failure

- Data Integrity
    - Regular data backups
    - Transaction atomicity
    - Bid verification redundancy
    - State consistency checks

- Error Handling
    - Graceful error recovery
    - User-friendly error messages
    - Automated error reporting
    - System state monitoring

### 3.4. Usability
- Admin Interface
    - Intuitive control panel
    - Real-time monitoring dashboard
    - Quick access to common functions
    - Clear status indicators

- User Experience
    - Clear bid feedback
    - Easily readable stream overlay
    - Consistent visual design
    - Mobile-friendly viewing

### 3.5. Maintainability
- Code Quality
    - Documented codebase
    - Modular architecture
    - Version control
    - Testing coverage

- Deployment
    - Automated deployment process
    - Configuration management
    - Environment separation
    - Rollback capability

### 3.6. Scalability
- User Scaling
    - Support for 1000+ concurrent viewers
    - Handle 100+ simultaneous active bidders
    - Process up to 10 bids per second
    - Efficient bid validation and processing
    - Optimized database operations for concurrent users

- Resource Management
    - Efficient memory usage for single stream
    - Asset caching optimization
    - CPU/GPU utilization monitoring for encoding
    - Database connection pooling for concurrent users
    - Redis caching for high-concurrency bid processing

## 4. System Overview

### 4.1. System Requirements

#### 4.1.1. Core System Capabilities
- System must support concurrent auctions
- System must handle real-time bidding
- System must manage livestream composition and delivery
- System must provide administrative controls
- System must maintain data consistency across operations
- System must support character-driven interactions

#### 4.1.2. Integration Requirements
- Must integrate with Twitter/X API for:
  - Bid monitoring
  - Stream delivery
  - User interactions
- Must integrate with blockchain networks for:
  - NFT transfers
  - Payment processing
  - Smart contract interactions
- Must support asset management for:
  - NFT artwork
  - Stream overlays
  - Character assets

#### 4.1.3. Scalability Requirements
- Must handle multiple concurrent bidders
- Must process bids in real-time with low latency
- Must maintain stream stability under viewer load
- Must scale storage based on asset requirements
- Must handle multiple daily auctions in sequence

#### 4.1.4. Operational Requirements
- Must provide real-time monitoring capabilities
- Must support automated recovery from failures
- Must maintain audit logs of all transactions
- Must allow administrative intervention when needed
- Must support configuration changes without downtime

### 4.2. Component Requirements

#### 4.2.1. Auction System
- Must track auction state and timing
- Must validate and process bids
- Must handle auction scheduling
- Must maintain bid history
- Must enforce auction rules
- Must handle concurrent bidders

#### 4.2.2. Stream System
- Must compose visual elements in real-time
- Must maintain consistent frame rate
- Must handle multiple asset types
- Must support scene transitions
- Must deliver high-quality output
- Must support preview capabilities

#### 4.2.3. Administrative System
- Must provide service monitoring
- Must allow manual intervention
- Must support configuration management
- Must provide audit capabilities
- Must handle user management

#### 4.2.4. Storage System
- Must persist auction data
- Must handle asset management
- Must maintain user records
- Must support data backup
- Must provide fast access to active data

## 5. Constraints
### 5.1. Technical
- The hardware in use is my laptop as a server and my m4 mac mini as a client. 
    - Laptop:
        - CPU: Intel(R) Core(TM) i7-10750H CPU @ 2.60GHz
        - GPU: NVIDIA GeForce RTX 2070 Super with Max-Q Design
        - RAM: 32GB
    - Mac Mini:
        - CPU: Apple M4 (Base)
        - RAM: 16GB
- Using ffmpeg to encode the stream.

### 5.2. Budget
- X/Twitter Premium Subscription: $10/month

### 5.3. Time
- I have a limited time to work on this project.

## 6. Assumptions & Dependencies
- Livestream will be hosted on X/Twitter.
- I will be using rented server hardware or 

## 7. Acceptance Criteria
### 7.1. Success Metrics

### 7.2. Testing Strategy

Before the first campaign or livestream marathon. 

Test-Run
- Livestream should run for 24 hours straight.
- Take 5 different bids.

## 8. Risks & Mitigation

### 8.1. Technical Risks
- The hardware may break or become unavailable.
- Power may go out locally.

## 9. Testing & Validation

## 10. Deployment & Maintenance Plan

### 10.1. Deployment Strategy

Testing is being done locally on my own hardware. It probably is enough to test the system before deploying to rented hardware or a custom server.

- #### Rented Hardware

    Streaming isnt something that is done usually on rented hardware. While the cpus, gpus, and other hardware are available, the issue become the network quota. The virtual machines usually have a low cap on how much data they can send/receive. Streaming being a very high bandwidth activity, it would be difficult to get a machine that can handle the stream.

- #### Custom Server

    Buying a custom server would be the best option. The hardware would be powerful enough to handle the stream and the network would not be an issue. The only issue would be the up front cost of the server, its maintainence and reliable deployment.


### 10.2. Maintenance Plan

