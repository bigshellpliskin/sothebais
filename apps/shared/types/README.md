# Types Directory

This directory contains TypeScript type definitions used throughout the SothebAIs project. These types are for development-time type checking and do not represent actual database schemas.

## Structure

- `index.ts` - Exports all types from this directory
- `events.ts` - Defines TypeScript interfaces for all event types in the system
- `models.ts` - Defines TypeScript interfaces for database models
- `stream.ts` - Defines TypeScript interfaces for stream configuration and state

## Purpose

The types defined in this directory serve several important purposes:

1. **Development-time Type Safety**: They provide type checking during development to catch errors early.

2. **API Contracts**: They define the shape of data exchanged between different parts of the application.

3. **Documentation**: They serve as self-documenting code that describes the structure of various entities.

4. **Code Completion**: They enable IDE features like auto-completion and inline documentation.

## Types vs. Schemas

It's important to understand the distinction between types and schemas in this project:

- **Types** (in this directory): TypeScript interfaces used during development for type checking. They have no runtime presence.

- **Schemas** (in `../schema/`): Actual database schema definitions that determine how data is stored and validated at runtime.

## Usage Example

```typescript
import { User, AuctionDTO } from '../shared/types';
import { EventType, AuctionStartEvent } from '../shared/types';

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