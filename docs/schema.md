# SothebAIs Schema Documentation

## Overview

SothebAIs uses a hybrid data storage approach to handle different types of data with appropriate storage solutions:

1. **PostgreSQL** (via Prisma) - For persistent, relational data
2. **Redis** - For real-time state and messaging
3. **File System** - For asset storage

This document outlines the schema design for each storage type and explains how they work together.

## 1. PostgreSQL Schema (Prisma)

PostgreSQL is used for persistent data storage, handling complex relationships, and maintaining historical records.

### 1.1. Core Models

#### User
- Represents users who interact with the system
- Stores authentication information and wallet addresses
- Linked to bids and preferences

#### Campaign
- Represents a collection of auctions for a project
- Contains start/end dates and status information
- Linked to a collection and multiple auctions

#### Collection
- Represents an NFT collection
- Contains metadata about the collection
- Linked to campaigns and art items

#### ArtItem
- Represents an NFT or artwork being auctioned
- Contains metadata and image URLs
- Linked to auctions and collections

#### Auction
- Represents a single auction event
- Contains timing, pricing, and status information
- Linked to campaigns, art items, and bids

#### Bid
- Represents a bid placed on an auction
- Contains amount, currency, and status
- Linked to users and auctions

#### Character
- Represents an AI character/agent for the stream
- Contains personality traits and asset references
- Stores memory and state information

### 1.2. Supporting Models

#### UserPreference
- Stores user preferences for notifications and display settings
- Linked to a user

#### StreamAsset
- Represents assets used in the stream
- Contains file paths and metadata
- Used for backgrounds, overlays, NFTs, etc.

#### EventLog
- Stores a history of system events
- Used for auditing and debugging

## 2. Redis Schema

Redis is used for real-time state management, caching, and pub/sub messaging.

### 2.1. Key Patterns

Redis keys follow a consistent pattern to organize data:

- `campaign:{id}` - Campaign state
- `campaign:day:{id}:{day}` - Campaign day state
- `auction:{id}` - Auction state
- `auction:price:{id}` - Current auction price
- `auction:bid:{id}` - Highest bid information
- `auction:timer:{id}` - Auction timer state
- `stream:{id}` - Stream state
- `stream:scene:{id}` - Stream scene layout
- `stream:metrics:{id}` - Stream performance metrics
- `stream:viewers:{id}` - Stream viewer count
- `agent:{id}` - Agent state
- `agent:mood:{id}` - Agent mood state
- `agent:context:{id}` - Agent context information
- `agent:scene:{id}` - Agent scene state

### 2.2. Data Models

#### Campaign State
- Real-time information about active campaigns
- Current day tracking
- Status updates

#### Auction State
- Real-time auction status
- Current price
- Highest bid information
- Timer state

#### Stream State
- Stream status and configuration
- Scene layout information
- Performance metrics
- Viewer counts

#### Agent State
- Character mood and context
- Conversation history
- Scene configuration

### 2.3. Pub/Sub Channels

Redis pub/sub is used for real-time communication between services:

- `events:auction` - Auction-related events
- `events:stream` - Stream-related events
- `events:agent` - Agent-related events
- `events:user` - User-related events
- `events:system` - System-related events

## 3. Event Schema vs. Event Types

In this project, we make a clear distinction between:

### 3.1. Event Types (TypeScript)

Event types are TypeScript interfaces and types used during development for:
- Type checking
- Code completion
- Documentation
- Compile-time error detection

These are defined in `apps/shared/types/events.ts` and are imported via:
```typescript
import { Event, EventType, EventSource } from '@shared/types';
```

### 3.2. Event Structure

All events include:
- `id` - Unique identifier
- `timestamp` - When the event occurred
- `type` - Event type (from EventType enum)
- `source` - Source service
- `version` - Schema version
- `data` - Event-specific data

### 3.3. Event Categories

Events are categorized by prefix:

- `auction:*` - Auction-related events (start, end, bids)
- `stream:*` - Stream-related events (start, end, quality)
- `agent:*` - Agent-related events (messages, mood changes)
- `user:*` - User-related events (connections, actions)
- `campaign:*` - Campaign-related events (start, end, updates)
- `system:*` - System-related events (health, errors, metrics)

## 4. File System Structure

Assets are stored on the file system and referenced by path in the database.

### 4.1. Asset Types

- **Stream Assets**
  - Backgrounds
  - Overlays
  - NFT images
  
- **Character Assets**
  - Expressions
  - Backgrounds
  - Props

### 4.2. Directory Structure

```
/data
  /assets
    /stream
      /backgrounds
      /overlays
      /nfts
    /character
      /expressions
      /backgrounds
      /props
  /logs
    /auction-engine
    /stream-manager
    /event-handler
    /agent-service
    /admin-frontend
```

## 5. Data Flow

### 5.1. Auction Flow

1. Auction is created in PostgreSQL
2. Auction state is initialized in Redis
3. Auction start event is emitted
4. Bids are processed through Redis
5. Bid history is stored in PostgreSQL
6. Auction end event is emitted
7. Final auction state is persisted to PostgreSQL

### 5.2. Stream Flow

1. Stream is created and configured
2. Stream state is managed in Redis
3. Scene updates are published via events
4. Stream metrics are collected in Redis
5. Stream logs are stored on disk
6. Stream end event is emitted
7. Stream summary is persisted to PostgreSQL

### 5.3. Agent Flow

1. Agent is initialized with character data
2. Agent state is managed in Redis
3. Agent interactions are processed via events
4. Agent mood and context are updated in Redis
5. Agent memory is persisted to PostgreSQL

## 6. Implementation Notes

### 6.1. PostgreSQL Setup

1. Install PostgreSQL dependencies:
   ```bash
   npm install @prisma/client
   npm install prisma --save-dev
   ```

2. Initialize Prisma:
   ```bash
   npx prisma init
   ```

3. Update DATABASE_URL in .env file:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/sothebais?schema=public"
   ```

4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

5. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

### 6.2. Redis Setup

1. Install Redis dependencies:
   ```bash
   npm install ioredis
   ```

2. Configure Redis connection:
   ```typescript
   import Redis from 'ioredis';
   
   const redis = new Redis({
     host: process.env.REDIS_HOST || 'localhost',
     port: parseInt(process.env.REDIS_PORT || '6379'),
     password: process.env.REDIS_PASSWORD,
   });
   ```

3. Use Redis for state management:
   ```typescript
   import { auctionKey } from '../shared/schema/redis/keys';
   import { AuctionState } from '../shared/schema/redis/models';
   
   // Store auction state
   await redis.set(
     auctionKey(auction.id),
     JSON.stringify(auctionState),
     'EX',
     86400 // 1 day TTL
   );
   
   // Retrieve auction state
   const auctionStateJson = await redis.get(auctionKey(auction.id));
   const auctionState = JSON.parse(auctionStateJson) as AuctionState;
   ```

### 6.3. Event Handling

1. Install event handling dependencies:
   ```bash
   npm install uuid
   ```

2. Emit events:
   ```typescript
   import { v4 as uuidv4 } from 'uuid';
   import { EventType, EventSource, BidPlacedEvent } from '../shared/schema/events/events';
   
   const bidPlacedEvent: BidPlacedEvent = {
     id: uuidv4(),
     timestamp: Date.now(),
     type: EventType.BID_PLACED,
     source: EventSource.AUCTION_ENGINE,
     version: '1.0',
     data: {
       bidId: bid.id,
       auctionId: auction.id,
       userId: user.id,
       twitterHandle: user.twitterHandle,
       amount: bid.amount.toString(),
       currency: bid.currency,
       timestamp: new Date().toISOString(),
     },
   };
   
   // Publish to Redis
   await redis.publish('events:auction', JSON.stringify(bidPlacedEvent));
   ```

3. Subscribe to events:
   ```typescript
   import { Event } from '../shared/schema/events/events';
   
   redis.subscribe('events:auction');
   
   redis.on('message', (channel, message) => {
     const event = JSON.parse(message) as Event;
     
     // Handle event based on type
     switch (event.type) {
       case EventType.BID_PLACED:
         handleBidPlaced(event as BidPlacedEvent);
         break;
       // Handle other event types
     }
   });
   ``` 

## 7. Types vs. Schemas

This project maintains a clear separation between:

### 7.1. TypeScript Types

Located in `apps/shared/types/`:
- Used during development
- Provide type safety and autocompletion
- Help catch errors at compile time
- Define interfaces for components to interact with each other

### 7.2. Database Schemas

#### PostgreSQL Schema (Prisma)
Located in `apps/shared/schema/prisma/schema.prisma`:
- Defines the actual database structure
- Used to generate migrations
- Enforces constraints at the database level
- Handles relationships between entities

#### Redis Schema
Located in `apps/shared/schema/redis/`:
- Defines key patterns and TTL values
- Provides helper functions for key generation
- Defines TypeScript interfaces that mirror the JSON structures stored in Redis

### 7.3. Relationship Between Types and Schemas

While there is often overlap between types and schemas, they serve different purposes:

- **Types**: Development-time type checking and documentation
- **Schemas**: Runtime data validation and storage structure

In some cases, you may need to convert between schema-defined structures and TypeScript types:

```typescript
// Converting from Prisma model to TypeScript type
import { User } from '@prisma/client';
import { UserDTO } from '@shared/types';

function userToDTO(user: User): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    // Omit sensitive or unnecessary fields
  };
}
``` 