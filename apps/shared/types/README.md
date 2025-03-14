# Types Directory

This directory contains TypeScript type definitions used throughout the SothebAIs project. These types are for development-time type checking and do not represent actual database schemas.

## Structure

- `index.ts` - Exports all types from this directory
- `events.ts` - Defines TypeScript interfaces for all event types in the system
- `models.ts` - Defines TypeScript interfaces for database models
- `stream.ts` - Defines TypeScript interfaces for stream configuration and state
- `twitter.ts` - Defines TypeScript interfaces for Twitter integration
- `auction.ts` - Defines TypeScript interfaces specific to auction functionality
- `core.ts` - Defines core TypeScript interfaces used across the application

## Purpose

The types defined in this directory serve several important purposes:

1. **Development-time Type Safety**: They provide type checking during development to catch errors early.

2. **API Contracts**: They define the shape of data exchanged between different parts of the application.

3. **Documentation**: They serve as self-documenting code that describes the structure of various entities.

4. **Code Completion**: They enable IDE features like auto-completion and inline documentation.

## Types Organization

The types are organized by domain to improve maintainability and discoverability:

- **Model Types** (`models.ts`): Database model interfaces like `User`, `Bid`, `ArtItem`, and DTOs like `AuctionDTO`
- **Twitter Types** (`twitter.ts`): Twitter-specific interfaces like `TwitterBid`, `TwitterStreamConfig`
- **Auction Types** (`auction.ts`): Auction-specific interfaces like `MarathonConfig`, `AuctionBid`, and `AuctionStats`
- **Stream Types** (`stream.ts`): Stream-related interfaces for broadcast configuration
- **Event Types** (`events.ts`): Event-related interfaces for the event system
- **Core Types** (`core.ts`): Foundational interfaces used across the application

## Type Relationships

Some types have related counterparts across different files:

- **Auction Types**:
  - `models.ts` contains database model types like `Auction` and `AuctionDTO` that represent persisted database entities
  - `auction.ts` contains runtime types like `MarathonConfig` and `AuctionBid` used for auction logic and API operations
  - `AuctionState` is defined in `../schema/redis/models.js` and represents the real-time auction state in Redis

- **Twitter Types**:
  - `twitter.ts` contains Twitter API and interaction types
  - `models.ts` includes Twitter-related database fields like `twitterHandle` in the `User` model

## Types vs. Schemas

It's important to understand the distinction between types and schemas in this project:

- **Types** (in this directory): TypeScript interfaces used during development for type checking. They have no runtime presence.

- **Schemas** (in `../schema/`): Actual database schema definitions that determine how data is stored and validated at runtime.

## Usage Example

```typescript
import { User, AuctionDTO } from '../shared/types';
import { EventType, AuctionStartEvent } from '../shared/types';
import { MarathonConfig, AuctionStats } from '../shared/types';

// Using model types
function displayUserProfile(user: User) {
  console.log(`${user.firstName} ${user.lastName}`);
  // TypeScript will ensure user has firstName and lastName properties
}

// Using event types
function handleEvent(event: AuctionStartEvent) {
  if (event.type === EventType.AUCTION_START) {
    console.log(`Auction ${event.data.auctionId} started at ${event.timestamp}`);
  }
}

// Using auction types
function configureAuctionMarathon(config: MarathonConfig) {
  console.log(`Marathon configured to run for ${config.totalDays} days`);
  console.log(`Daily auctions: ${config.dailyStartTime} to ${config.dailyEndTime}`);
  return startMarathon(config);
}

// Using DTOs for API responses
function formatAuctionResponse(auction: AuctionDTO) {
  return {
    id: auction.id,
    title: auction.title,
    currentBid: auction.currentBid,
    // TypeScript ensures these properties exist
  };
}
``` 