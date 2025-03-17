# SothebAIs Schema Documentation

## Table of Contents
- [Overview](#overview)
- [1. PostgreSQL Schema (Prisma)](#1-postgresql-schema-prisma)
  - [1.1. Core Models](#11-core-models)
    - [User](#user)
    - [Campaign](#campaign)
    - [Collection](#collection)
    - [ArtItem](#artitem)
    - [Auction](#auction)
    - [Bid](#bid)
    - [Character](#character)
  - [1.2. Supporting Models](#12-supporting-models)
    - [UserPreference](#userpreference)
    - [StreamAsset](#streamasset)
    - [EventLog](#eventlog)
- [2. Redis Schema](#2-redis-schema)
  - [2.1. Key Patterns](#21-key-patterns)
  - [2.2. Data Models](#22-data-models)
    - [Campaign State](#campaign-state)
    - [Auction State](#auction-state)
    - [Stream State](#stream-state)
    - [Agent State](#agent-state)
  - [2.3. Pub/Sub Channels](#23-pubsub-channels)
- [3. Event Schema vs. Event Types](#3-event-schema-vs-event-types)
  - [3.1. Event Types (TypeScript)](#31-event-types-typescript)
  - [3.2. Event Structure](#32-event-structure)
  - [3.3. Event Categories](#33-event-categories)
- [4. File System Structure](#4-file-system-structure)
  - [4.1. Asset Types](#41-asset-types)
  - [4.2. Directory Structure](#42-directory-structure)
- [5. Data Flow](#5-data-flow)
  - [5.1. Auction Flow](#51-auction-flow)
  - [5.2. Stream Flow](#52-stream-flow)
  - [5.3. Agent Flow](#53-agent-flow)
- [6. Implementation Notes](#6-implementation-notes)
  - [6.1. PostgreSQL Setup](#61-postgresql-setup)
  - [6.2. Redis Setup](#62-redis-setup)
  - [6.3. Event Handling](#63-event-handling)
- [7. Types vs. Schemas](#7-types-vs-schemas)
  - [7.1. TypeScript Types](#71-typescript-types)
  - [7.2. Database Schemas](#72-database-schemas)
  - [7.3. Relationship Between Types and Schemas](#73-relationship-between-types-and-schemas)

## Overview

SothebAIs uses a hybrid data storage approach to handle different types of data with appropriate storage solutions:

1. **PostgreSQL** (via Prisma) - For persistent, relational data
2. **Redis** - For real-time state and messaging
3. **File System** - For asset storage

This document outlines the schema design for each storage type and explains how they work together. It complements the [Architecture Documentation](architecture.md) by providing detailed data models and the [Requirements Documentation](requirements.md) by implementing the data needs specified there.

### Related Documentation

- For system design and component interactions, see the [Architecture Documentation](architecture.md)
- For user stories and functional requirements, see the [Requirements Documentation](requirements.md)
- For API endpoints that use these schemas, see the [API Documentation](api-documentation.md)

### Schema Usage

The schemas defined in this document are implemented in:
- Prisma schema files for PostgreSQL (`packages/src/schema/prisma/`)
- TypeScript interfaces for Redis data (`packages/src/schema/redis/`)
- TypeScript type definitions for events (`packages/src/types/events.ts`)

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

These are defined in `packages/src/types/events.ts` and are imported via:
```