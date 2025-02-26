# SothebAIs API Documentation

This document provides comprehensive documentation for all API endpoints in the SothebAIs platform. The platform consists of several microservices, each with its own API endpoints.

## Table of Contents

- [1. Overview](#1-overview)
- [2. Authentication](#2-authentication)
- [3. Stream Manager Service](#3-stream-manager-service)
   - [3.1. Get Stream Status](#31-get-stream-status)
   - [3.2. Start Stream](#32-start-stream)
   - [3.3. Stop Stream](#33-stop-stream)
   - [3.4. Get Stream Configuration](#34-get-stream-configuration)
   - [3.5. Get Current Frame](#35-get-current-frame)
- [4. Auction Engine Service](#4-auction-engine-service)
   - [4.1. Start Auction Marathon](#41-start-auction-marathon)
   - [4.2. Start Daily Auction](#42-start-daily-auction)
   - [4.3. End Daily Auction](#43-end-daily-auction)
   - [4.4. Get Current Auction State](#44-get-current-auction-state)
   - [4.5. Process Bid](#45-process-bid)
- [5. Event Handler Service](#5-event-handler-service)
   - [5.1. Publish Event](#51-publish-event)
   - [5.2. Get Events](#52-get-events)
- [6. ElizaOS Agent Service](#6-elizaos-agent-service)
   - [6.1. Get Agent State](#61-get-agent-state)
   - [6.2. Send Message to Agent](#62-send-message-to-agent)
- [7. Admin Service](#7-admin-service)
   - [7.1. Get System Status](#71-get-system-status)
   - [7.2. Get Auction History](#72-get-auction-history)
- [8. WebSocket API](#8-websocket-api)
   - [8.1. Stream Manager WebSocket](#81-stream-manager-websocket)
   - [8.2. Event Handler WebSocket](#82-event-handler-websocket)
- [9. Error Handling](#9-error-handling)
   - [9.1. Error Response Format](#91-error-response-format)
   - [9.2. Common Error Codes](#92-common-error-codes)

## 1. Overview

The SothebAIs platform is built on a microservices architecture with the following core services:

- **Stream Manager**: Handles video stream composition, rendering, and delivery
- **Event Handler**: Processes and routes events throughout the system
- **Auction Engine**: Manages auction state, bids, and winner determination
- **ElizaOS Agent**: Manages character state and interactions
- **Admin**: Provides administrative interfaces and controls

All API endpoints follow RESTful conventions and return JSON responses unless otherwise specified.

### Related Documentation

- For detailed system architecture, see the [Architecture Documentation](architecture.md)
- For data models used by these APIs, see the [Schema Documentation](schema.md)
- For user stories and requirements, see the [Requirements Documentation](requirements.md)

### API and System Architecture

The API endpoints documented here directly correspond to the services described in the architecture document:

- Each service exposes its own set of endpoints
- Services communicate with each other through these APIs and through the event system
- The API design follows the event-driven architecture pattern described in the [architecture document](architecture.md#51-event-driven-architecture)

## 2. Authentication

Most endpoints require authentication using JWT tokens. Authentication is handled by Clerk.

### Headers

```
Authorization: Bearer <token>
```

## 3. Stream Manager Service

Base URL: `/stream`

The Stream Manager service handles all aspects of video stream composition, rendering, and delivery.

### Endpoints

#### 3.1. Get Stream Status

```
GET /stream/status
```

Returns the current status of the stream.

**Response**

```json
{
  "success": true,
  "data": {
    "isLive": true,
    "isPaused": false,
    "fps": 30,
    "frameCount": 1200,
    "droppedFrames": 0,
    "averageRenderTime": 12,
    "startTime": 1645678901234
  }
}
```

#### 3.2. Start Stream

```
POST /stream/start
```

Starts the stream.

**Response**

```json
{
  "success": true,
  "data": {
    "isLive": true,
    "isPaused": false,
    "fps": 30,
    "frameCount": 0,
    "droppedFrames": 0,
    "averageRenderTime": 0,
    "startTime": 1645678901234
  }
}
```

#### 3.3. Stop Stream

```
POST /stream/stop
```

Stops the stream.

**Response**

```json
{
  "success": true,
  "data": {
    "isLive": false,
    "isPaused": false,
    "fps": 0,
    "frameCount": 0,
    "droppedFrames": 0,
    "averageRenderTime": 0,
    "startTime": null
  }
}
```

#### 3.4. Get Stream Configuration

```
GET /stream/config
```

Returns the current stream configuration.

**Response**

```json
{
  "STREAM_RESOLUTION": "1920x1080",
  "TARGET_FPS": 30,
  "RENDER_QUALITY": "high",
  "MAX_LAYERS": 10,
  "STREAM_BITRATE": "6000k",
  "ENABLE_HARDWARE_ACCELERATION": true
}
```

#### 3.5. Get Current Frame

```
GET /stream/frame
```

Returns the current frame as a PNG image.

**Response**

Binary image data with Content-Type: image/png

## 4. Auction Engine Service

Base URL: `/auction`

The Auction Engine service manages all aspects of auctions, including state management, bid processing, and winner determination.

### Endpoints

#### 4.1. Start Auction Marathon

```
POST /auction/marathon/start
```

Starts a new auction marathon.

**Request Body**

```json
{
  "name": "Summer Collection 2023",
  "startDate": "2023-06-01T00:00:00Z",
  "endDate": "2023-06-30T23:59:59Z",
  "dailyStartTime": "10:00:00",
  "dailyEndTime": "22:00:00",
  "timezone": "America/New_York",
  "items": [
    {
      "id": "item-001",
      "name": "Digital Artwork #1",
      "description": "A beautiful digital artwork",
      "startingPrice": 100,
      "reservePrice": 500,
      "imageUrl": "https://example.com/images/item-001.jpg"
    }
  ]
}
```

**Response**

```json
{
  "status": "success",
  "message": "Auction marathon started",
  "marathonId": "marathon-123456"
}
```

#### 4.2. Start Daily Auction

```
POST /auction/daily/start/:marathonId
```

Starts the daily auction for a specific marathon.

**Response**

```json
{
  "status": "success",
  "message": "Daily auction started"
}
```

#### 4.3. End Daily Auction

```
POST /auction/daily/end/:marathonId
```

Ends the daily auction for a specific marathon.

**Response**

```json
{
  "status": "success",
  "message": "Daily auction ended"
}
```

#### 4.4. Get Current Auction State

```
GET /auction/state/:marathonId
```

Returns the current state of an auction.

**Response**

```json
{
  "status": "success",
  "state": {
    "marathonId": "marathon-123456",
    "currentItem": {
      "id": "item-001",
      "name": "Digital Artwork #1",
      "description": "A beautiful digital artwork",
      "startingPrice": 100,
      "reservePrice": 500,
      "imageUrl": "https://example.com/images/item-001.jpg"
    },
    "currentBid": {
      "userId": "user-789",
      "amount": 350,
      "timestamp": 1645678901234
    },
    "startTime": 1645678901234,
    "endTime": 1645682501234,
    "status": "active"
  }
}
```

#### 4.5. Process Bid

```
POST /auction/bid/:marathonId
```

Processes a bid for the current auction.

**Request Body**

```json
{
  "userId": "user-789",
  "amount": 400,
  "timestamp": 1645679001234,
  "tweetId": "1234567890",
  "tweetText": "I bid $400 on the Digital Artwork #1 #SothebAIs"
}
```

**Response**

```json
{
  "status": "accepted",
  "message": "Bid was accepted as the new highest bid",
  "bid": {
    "userId": "user-789",
    "amount": 400,
    "timestamp": 1645679001234
  }
}
```

## 5. Event Handler Service

Base URL: `/events`

The Event Handler service processes and routes events throughout the system.

### Endpoints

#### 5.1. Publish Event

```
POST /events/publish
```

Publishes a new event to the system.

**Request Body**

```json
{
  "type": "BID_PLACED",
  "payload": {
    "marathonId": "marathon-123456",
    "userId": "user-789",
    "amount": 400,
    "timestamp": 1645679001234
  },
  "source": "twitter-monitor",
  "timestamp": 1645679001234
}
```

**Response**

```json
{
  "success": true,
  "eventId": "evt-123456",
  "timestamp": 1645679001235
}
```

#### 5.2. Get Events

```
GET /events?type=BID_PLACED&limit=10
```

Retrieves events filtered by type.

**Query Parameters**

- `type` (optional): Filter by event type
- `limit` (optional): Maximum number of events to return (default: 100)
- `offset` (optional): Offset for pagination (default: 0)
- `startTime` (optional): Filter events after this timestamp
- `endTime` (optional): Filter events before this timestamp

**Response**

```json
{
  "success": true,
  "events": [
    {
      "id": "evt-123456",
      "type": "BID_PLACED",
      "payload": {
        "marathonId": "marathon-123456",
        "userId": "user-789",
        "amount": 400,
        "timestamp": 1645679001234
      },
      "source": "twitter-monitor",
      "timestamp": 1645679001234
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0
  }
}
```

## 6. ElizaOS Agent Service

Base URL: `/agent`

The ElizaOS Agent service manages character state and interactions.

### Endpoints

#### 6.1. Get Agent State

```
GET /agent/state
```

Returns the current state of the agent.

**Response**

```json
{
  "success": true,
  "state": {
    "mood": "excited",
    "context": {
      "currentAuction": "marathon-123456",
      "currentItem": "item-001",
      "highestBidder": "user-789",
      "highestBid": 400
    },
    "lastInteraction": 1645679001234
  }
}
```

#### 6.2. Send Message to Agent

```
POST /agent/message
```

Sends a message to the agent for processing.

**Request Body**

```json
{
  "userId": "user-123",
  "message": "What's the current bid?",
  "platform": "twitter",
  "timestamp": 1645679101234
}
```

**Response**

```json
{
  "success": true,
  "response": {
    "message": "The current highest bid is $400 by @user789!",
    "mood": "helpful",
    "timestamp": 1645679101300
  }
}
```

## 7. Admin Service

Base URL: `/admin`

The Admin service provides administrative interfaces and controls.

### Endpoints

#### 7.1. Get System Status

```
GET /admin/status
```

Returns the status of all system components.

**Response**

```json
{
  "success": true,
  "services": {
    "streamManager": {
      "status": "healthy",
      "uptime": 86400,
      "version": "1.0.0"
    },
    "eventHandler": {
      "status": "healthy",
      "uptime": 86400,
      "version": "1.0.0"
    },
    "auctionEngine": {
      "status": "healthy",
      "uptime": 86400,
      "version": "1.0.0"
    },
    "agent": {
      "status": "healthy",
      "uptime": 86400,
      "version": "1.0.0"
    }
  }
}
```

#### 7.2. Get Auction History

```
GET /admin/auctions
```

Returns a list of all auctions.

**Response**

```json
{
  "success": true,
  "auctions": [
    {
      "id": "marathon-123456",
      "name": "Summer Collection 2023",
      "startDate": "2023-06-01T00:00:00Z",
      "endDate": "2023-06-30T23:59:59Z",
      "status": "active",
      "totalItems": 30,
      "completedItems": 15,
      "totalBids": 450,
      "totalValue": 12500
    }
  ]
}
```

## 8. WebSocket API

The SothebAIs platform provides real-time updates through WebSocket connections.

### 8.1. Stream Manager WebSocket

```
WebSocket: ws://{domain}/ws
```

Provides real-time updates about the stream state.

#### Message Types

**Stream State Update**

```json
{
  "type": "STREAM_STATE_UPDATE",
  "data": {
    "isLive": true,
    "fps": 30,
    "frameCount": 1200,
    "droppedFrames": 0,
    "averageRenderTime": 12
  }
}
```

**Scene Update**

```json
{
  "type": "SCENE_UPDATE",
  "data": {
    "sceneId": "auction-scene",
    "layers": [
      {
        "id": "background",
        "type": "image",
        "source": "background.jpg",
        "visible": true
      },
      {
        "id": "item-display",
        "type": "image",
        "source": "item-001.jpg",
        "visible": true
      },
      {
        "id": "bid-overlay",
        "type": "text",
        "content": "Current Bid: $400",
        "visible": true
      }
    ]
  }
}
```

### 8.2. Event Handler WebSocket

```
WebSocket: ws://{domain}/events/stream
```

Provides real-time updates about system events.

#### Message Types

**Event Notification**

```json
{
  "type": "EVENT",
  "data": {
    "id": "evt-123456",
    "type": "BID_PLACED",
    "payload": {
      "marathonId": "marathon-123456",
      "userId": "user-789",
      "amount": 400,
      "timestamp": 1645679001234
    },
    "source": "twitter-monitor",
    "timestamp": 1645679001234
  }
}
```

## 9. Error Handling

All API endpoints follow a consistent error handling pattern.

### 9.1. Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information",
  "code": "ERROR_CODE"
}
```

### 9.2. Common Error Codes

- `UNAUTHORIZED`: Authentication required or failed
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `BAD_REQUEST`: Invalid request parameters
- `INTERNAL_ERROR`: Server error
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable 