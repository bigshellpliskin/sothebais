# SothebAIs Architecture

## Overview

SothebAIs is a real-time NFT auction platform that enables social interaction through Twitter/X livestreams. The system is designed to handle concurrent auctions, real-time bidding, and dynamic stream composition while maintaining high reliability and performance.

## Core Services

### 1. Traefik (Reverse Proxy/Load Balancer)
- **Purpose**: Edge routing, load balancing, and SSL termination
- **Key Features**:
  - WebSocket support for real-time communication
  - Built-in monitoring and metrics
  - Health check management
  - Access logging and security
  - SSL/TLS termination
- **Metrics & Monitoring**:
  - Request rates and latencies
  - HTTP status codes
  - WebSocket connection stats
  - Error rates
  - Built-in dashboard (`:8080`)

### 2. Admin Frontend (Next.js)
- **Purpose**: Administration dashboard and auction management interface
- **Key Features**:
  - Auction configuration and monitoring
  - Real-time auction status and preview
  - Stream composition control
  - Bidding interface and history
  - User authentication (Clerk)
  - WebSocket client for real-time updates
- **Metrics & Monitoring**:
  - Page load times
  - API route performance
  - Client-side errors
  - Build analytics
  - Custom system dashboard

### 3. Stream Manager
- **Purpose**: Handle stream composition, RTMP ingestion, and real-time updates
- **Key Features**:
  - RTMP server (port 1935)
  - WebSocket server for real-time communication
  - Stream composition and scene management
  - Asset management and caching
  - FFmpeg pipeline management
  - Twitter/X stream integration
- **Metrics & Monitoring**:
  - Active streams
  - Bandwidth usage
  - FPS metrics
  - Error rates
  - Connected viewers

### 4. Auction Engine
- **Purpose**: Core auction business logic and bid processing
- **Key Features**:
  - Bid validation and processing
  - Smart contract integration
  - Twitter bid monitoring
  - Real-time price updates
  - Winner determination
  - Campaign scheduling
- **Metrics & Monitoring**:
  - Active auctions
  - Bid processing rate
  - Contract interaction stats
  - Twitter API usage
  - Event processing latency

### 5. Redis
- **Purpose**: Real-time data store and message broker
- **Key Features**:
  - In-memory data storage
  - Pub/sub messaging
  - Session management
  - Caching layer
  - Rate limiting
- **Metrics & Monitoring**:
  - Memory usage
  - Connected clients
  - Operations per second
  - Cache hit/miss ratio
  - Channel subscription stats

### 6. Event Handler
- **Purpose**: Manage system-wide event distribution and processing
- **Key Features**:
  - Event validation and routing
  - Event persistence and replay
  - Dead letter queue management
  - Event correlation and tracking
  - Retry mechanisms
  - Event filtering and transformation
- **Metrics & Monitoring**:
  - Event throughput
  - Processing latency
  - Retry counts
  - Dead letter queue size
  - Channel statistics

### 7. Agent Service (ElizaOS)
- **Purpose**: Manage AI-driven social interactions and stream personality
- **Key Features**:
  - Twitter/X message monitoring
  - LLM-based response generation
  - Personality/Character management
  - Asset selection for responses
  - Stream state management
  - Contextual memory
- **Metrics & Monitoring**:
  - Response latency
  - Message queue size
  - Character state transitions
  - Social engagement metrics
  - LLM token usage

## Port Hierarchy

### System Ports (0-1023)
- **80**: HTTP (Traefik)
- **443**: HTTPS (Traefik)

### User Ports (1024-49151)
- **1935**: RTMP Streaming (Stream Manager)
- **3000**: Admin Frontend
  - **3001**: Admin WebSocket (Stream Preview)
  - **3090**: Admin Metrics
  - **3091**: Admin Health

- **4200-4299**: Stream Manager Block
  - **4200**: Stream Manager API
  - **4201**: Stream Manager WebSocket
  - **4290**: Stream Manager Metrics
  - **4291**: Stream Manager Health

- **4300-4399**: Event Handler Block
  - **4300**: Event Handler API
  - **4301**: Event Handler WebSocket
  - **4390**: Event Handler Metrics
  - **4391**: Event Handler Health

- **4400-4499**: Auction Engine Block
  - **4400**: Auction Engine API
  - **4401**: Auction Engine WebSocket
  - **4490**: Auction Engine Metrics
  - **4491**: Auction Engine Health

- **4500-4599**: Agent Service Block
  - **4500**: Agent Service API
  - **4501**: Agent WebSocket
  - **4590**: Agent Metrics
  - **4591**: Agent Health

- **6379**: Redis
- **8080**: Traefik Dashboard

### Port Patterns
- **Service Block**: 100 ports per service (x00-x99)
- **Base Service Port**: Block start (e.g., 4200, 4300)
- **WebSocket Port**: Base + 1 (e.g., 4201, 4301)
- **Metrics Port**: Base + 90 (e.g., 4290, 4390)
- **Health Port**: Base + 91 (e.g., 4291, 4391)
- **Additional Ports**: Base + 2 through Base + 89 (reserved for service-specific needs)

### Environment Variables
```env
# Traefik Ports
TRAEFIK_HTTP_PORT=80
TRAEFIK_HTTPS_PORT=443
TRAEFIK_DASHBOARD_PORT=8080

# Admin Frontend Ports (3000 block)
ADMIN_PORT=3000
ADMIN_WS_PORT=3001
ADMIN_METRICS_PORT=3090
ADMIN_HEALTH_PORT=3091

# Stream Manager Ports (4200 block)
STREAM_MANAGER_PORT=4200
STREAM_MANAGER_WS_PORT=4201
STREAM_MANAGER_METRICS_PORT=4290
STREAM_MANAGER_HEALTH_PORT=4291
STREAM_MANAGER_RTMP_PORT=1935

# Event Handler Ports (4300 block)
EVENT_HANDLER_PORT=4300
EVENT_HANDLER_STREAM_PORT=4301
EVENT_HANDLER_METRICS_PORT=4390
EVENT_HANDLER_HEALTH_PORT=4391

# Auction Engine Ports (4400 block)
AUCTION_ENGINE_PORT=4400
AUCTION_ENGINE_WS_PORT=4401
AUCTION_ENGINE_METRICS_PORT=4490
AUCTION_ENGINE_HEALTH_PORT=4491

# Agent Service Ports (4500 block)
AGENT_SERVICE_PORT=4500
AGENT_SERVICE_WS_PORT=4501
AGENT_SERVICE_METRICS_PORT=4590
AGENT_SERVICE_HEALTH_PORT=4591

# Redis Port
REDIS_PORT=6379
```

### Port Exposure
- **Public Ports**: 
  - 80 (HTTP)
  - 443 (HTTPS)
  - 1935 (RTMP)
- **Internal Ports**:
  - All metrics ports
  - All health check ports
  - Redis
- **Conditional Exposure**:
  - 8080 (Traefik Dashboard) - Development only
  - WebSocket ports - Through Traefik reverse proxy

## Data Storage Strategy

### 1. Redis (Real-time Data)
- **Purpose**: Fast, in-memory data store and message broker
- **Use Cases**:
  - Real-time state (auction status, bids)
  - Caching layer
  - Session management
  - Pub/sub messaging
  - Rate limiting
- **Metrics**:
  - Memory usage
  - Connected clients
  - Operations per second
  - Hit/miss ratios
  - Pub/sub stats

### 2. Local File System (Docker Volumes)
- **Purpose**: Persistent storage for local assets and logs
- **Use Cases**:
  - Stream assets (overlays, backgrounds)
  - Generated content
  - System logs
  - Temporary stream recordings
- **Volumes**:
  - `stream_storage`: Stream-related assets
  - `assets_storage`: General assets

### 3. PostgreSQL (Structured Data)
- **Purpose**: Persistent storage for business data
- **Use Cases**:
  - Auction data
  - User information
  - Bid history
  - Analytics
  - Relationships between entities

### 4. Object Storage (MinIO/S3)
- **Purpose**: Large file storage
- **Use Cases**:
  - NFT assets
  - Stream recordings
  - Large media files
  - Backup data

## Inter-Service Communication

### 1. Event-Driven Architecture
- **Event Categories**:
  - System Events: Health checks, metrics, debugging
  - Business Events: Bids, auction state changes, winners
  - Stream Events: Quality updates, scene changes
  - User Events: Connections, interactions
  - **Agent Events**:
    - Social interactions
    - Character state changes
    - Asset selection requests
    - Stream state updates
    - Personality transitions

- **Event Channels**:
  - Dedicated channels per domain
  - Separate debug channels per service
  - System-wide notification channel
  - Health check channel

- **Event Patterns**:
  - Command events (requesting actions)
  - State change events (notifications)
  - Error events (system issues)
  - Metric events (monitoring)

- **Event Flow**:
  1. Twitter messages monitored by Agent Service
  2. Agent processes messages through LLM
  3. Agent emits events for:
     - Response generation
     - Asset selection
     - Stream state updates
  4. Stream Manager updates composition
  5. Admin Frontend reflects changes

### 2. Redis Pub/Sub (Low-latency, non-critical)
- Real-time updates
- Temporary state changes
- Metrics updates
- Debug messages

### 3. HTTP/REST
- Service-to-service API calls
- Admin operations
- Data queries
- Health checks

### 4. WebSocket
- Real-time bidirectional communication
- Stream updates
- Live metrics
- User notifications

### 5. Agent-Stream Integration
- **Character State Management**:
  - Personality selection
  - Mood transitions
  - Context awareness
  - Memory management

- **Asset Coordination**:
  - Dynamic asset selection
  - Expression changes
  - Scene composition updates
  - Overlay modifications

- **Social Interaction Flow**:
  1. Twitter message received
  2. Agent analyzes context
  3. Character state updated
  4. Response generated
  5. Assets selected
  6. Stream state modified
  7. Visual feedback rendered

## System Monitoring

### Health Checks
- Each service implements health endpoints
- Traefik monitors service health
- Automatic recovery procedures
- Health status in admin dashboard

### Metrics Collection
- **Stream Metrics**:
  - Active streams
  - Bandwidth usage
  - FPS
  - Viewer count
  - Error rates

- **System Metrics**:
  - Memory usage
  - CPU utilization
  - Network stats
  - Error rates
  - API latencies

- **Business Metrics**:
  - Active auctions
  - Bid rates
  - User engagement
  - Success rates
  - Revenue stats

### Monitoring Dashboard
- Integrated into Admin Frontend
- Real-time updates via WebSocket
- Custom metrics visualization
- Alert configuration
- Historical data view

## Stream State Management

### Character-Driven Composition
- **Visual Elements**:
  - Character expressions
  - Mood indicators
  - Interaction feedback
  - Social context display

- **State Machine**:
  - Character mood states
  - Interaction modes
  - Energy levels
  - Engagement patterns

- **Asset Management**:
  - Expression library
  - Mood-based backgrounds
  - Interactive overlays
  - Transition effects

### Social Integration
- **Twitter Integration**:
  - Message monitoring
  - Bid detection
  - Audience engagement
  - Community management

- **Response Generation**:
  - Context-aware replies
  - Personality-driven content
  - Multi-modal responses
  - Engagement strategies

- **Stream Adaptation**:
  - Dynamic scene updates
  - Character state reflection
  - Interaction visualization
  - Audience feedback display

## Security

### Edge Security
- SSL/TLS termination at Traefik
- Rate limiting
- IP filtering
- DDoS protection

### Application Security
- Authentication via Clerk
- Role-based access control
- Input validation
- XSS protection
- CSRF protection

### Data Security
- Encrypted storage
- Secure communication
- Access logging
- Audit trails

## Deployment

### Development
- Docker Compose
- Local volumes
- Hot reloading
- Debug logging

### Production
- Docker Compose/Swarm
- Cloud object storage
- SSL certificates
- Production logging
