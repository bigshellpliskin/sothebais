# Requirements

1. Host a livestream daily on X/Twitter.
2. Livestream feed should contain:
    - Auction view
        - Display art item being auctioned.
        - Show one male and other female assistant.
    - V-tuber-esque auction host
    - Chat Feed
    - Info panel
        - Art Item Name
        - Artist Name
        - Auction Price
        - Time Remaining

## 1. Introduction/Overview
### 1.1. Purpose and Scope

#### 1.1.1. Purpose

SothebAIs is a system that allows users to socially interact with NFT auctions and follow them in real-time on twitter/X.

#### 1.1.2. Scope

The system will be a collection of services that can be hosted on hardware powerful enough to handle livestreaming.

### 1.2. Definitions, Acronyms, and Abbreviations

- **Auction**
    - A timed-event held on a livestream that at least one art items that are being auctioned.
    - Duration: 1-2 hours
    - Detailed Schedule
- **Campaign**
    - A series of regularly scheduled Auctions.
    - Follows a specific project or art collection.
- **Livestream**
    - A livestream that is being hosted on X/Twitter.

Visual Components
- **Assets**
    - Static assets stored locally or remotely that are used in the the Scene/Render.
- **Scene**
    - High level description of elements.
    - Quadrant-based scene composition.
    - Assets positioned relative to quadrant bounds.
    - Z-index ordering within quadrants.
    - Background, Quadrant, Overlay layers.
- **
- **Composition**
    - Takes the scene data and renders it to an image.
    - Internal data representation to image.
- **Feed**
    - The stream that is generated from the ffmpeg process.
    - Image to Video.

### 1.3. System Overview

#### 1.3.1. System Architecture

##### Service Architecture
- **Admin Frontend**: Next.js dashboard for system control
- **Stream Manager**: Handles video composition and streaming
  - Frame rate: 30fps
  - Resolution: 1280x720p
  - Quadrant-based scene composition
- **Auction Manager**: Core auction orchestration
  - Bid processing
  - State management
  - Blockchain integration
- **Event Handler**: Inter-service communication
- **ElizaOS**: AI character interaction system
- **Shared**: Common utilities and types

##### Infrastructure
- Redis for state management and caching
- Docker for containerization
- Prometheus/Grafana for monitoring

#### 1.3.2. System Components

- Admin Frontend
- Stream Manager
- Auction Manager
- Event Handler
- Eliza
- Shared

## 2. Functional Requirements
What the system should do.
### 2.1. User Features

Livestream Feed
- User should be able to watch the livestream on twitter/X.
    - User should see and hear the auction host.
    - User should be able to see basic auction info progress live on the livestream.
    - User should be able to see the art item being auctioned.

Auction Interaction
- User should be able to deposit crypto into an escrow wallet.
- User should be able to tweet the transaction or wallet address in a specific format to place a bid. 




### 2.2. System Functions
- System should be able to accept bids via twitter/X.
- System should be able to track the bids live on the auction view.
- System should be able to handle all auction logic.
- System should be able to handle a campaign, n days in length, where auctions are held at a sceheduled time daily.
- System should interact with Ethereum, Polygon, Base, Shape and other EVM chains.

### 2.3. Data Management

Auction Data
- System should be able to store the bids in a database.
- System should be able to store the auction data in a database.

User Data
- System should be able to store the user data in a database.
- System should be able to store the user's twitter handle in a database.   
- System should be able to store the user's wallet address in a database.

### 2.4. Scene Management
- System should support quadrant-based scene composition:
  - 4 fixed quadrants
  - Each quadrant has defined bounds and padding
  - Assets positioned relative to quadrant bounds
  - Z-index ordering within quadrants
- Support for background, quadrant, and overlay assets


## 3. Non-functional Requirements
How the system should perform.

### 3.1. Performance
- Min Stream Specs
    - Resolution: 1280x720p
    - Frame Rate: 30fps
    - Bitrate: 4-6k kbps

### 3.2. Security
- System should ensure only admins have control over the auction.

### 3.3. Reliability
- System should be able to run for extended periods of time.
### 3.4. Maintainability

### 3.5. Usability
- System should have high level admin controls.
### 3.6. Scalability
- We dont really need that many scalability features since we are just rendering and serving one feed to twitter. They're the ones that have to handle many viewers.


## 4. Constraints
#### 4.1. Technical
- The hardware in use is my laptop as a server and my m4 mac mini as a client. 
    - Laptop:
        - CPU: Intel(R) Core(TM) i7-10750H CPU @ 2.60GHz
        - GPU: NVIDIA GeForce RTX 2070 Super with Max-Q Design
        - RAM: 32GB
    - Mac Mini:
        - CPU: Apple M4 (Base)
        - RAM: 16GB
- Using ffmpeg to encode the stream.

#### 4.2. Budget
- X/Twitter Premium Subscription: $10/month

#### 4.3. Time

## 5. Assumptions & Dependencies
- Livestream will be hosted on X/Twitter.
- I will be using rented server hardware or 

## 6. Acceptance Criteria
### 6.1. Success Metrics
### 6.2. Testing Strategy

Before the first campaign or livestream marathon. 

Test-Run
- Livestream should run for 24 hours straight.
- Take 5 different bids.