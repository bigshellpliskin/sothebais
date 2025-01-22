# Event Handler Service

## Overview
The Event Handler is the central orchestration service in the NFT Auction System, responsible for managing communication and state synchronization between all microservices. As shown in the system architecture, it acts as the primary event routing and system orchestration layer, ensuring reliable communication between the Auction Manager, Stream Manager, ElizaOS, and Shape L2 services.

## Architecture

### Core Components
- **Express Server**: Handles HTTP requests and provides API endpoints
- **Redis Client**: Manages event queuing, state persistence, and real-time communication
- **Service Integration**: Orchestrates communication between core services:
  - Auction Manager: NFT lifecycle and bid processing (port 4100)
  - Stream Manager: Twitter integration and bid monitoring (port 4200)
  - ElizaOS: Character assets and visual output (port 3000)
  - Shape L2: Smart contract integration and NFT transfers (port 4000)

### Technical Specifications
- **Port**: 4300
- **Runtime**: Node.js 22
- **Resource Limits** (Production):
  - CPU: 0.50 cores
  - Memory: 512MB
- **Logging Configuration**:
  - Driver: json-file
  - Max Size: 100MB
  - Max Files: 3
- **Key Dependencies**:
  - express: ^4.18.2 (REST API framework)
  - redis: ^4.6.12 (Event queue and message broker)
  - nodemon: ^3.0.2 (Development hot-reload)

## Setup and Development

### Prerequisites
- Node.js 22 or higher
- Docker
- Redis instance

### Environment Variables
```env
NODE_ENV=production|development
PORT=4300 (default)
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
AUCTION_MANAGER_URL=http://auction-manager:4100
STREAM_MANAGER_URL=http://stream-manager:4200
ELIZA_URL=http://eliza:3000
SHAPE_L2_URL=http://shape-l2:4000
```

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

### Docker Development

The service includes a development Dockerfile (`Dockerfile.dev`) for containerized development:

```bash
docker build -f Dockerfile.dev -t event-handler-dev .
docker run -p 4300:4300 event-handler-dev
```

## API Endpoints

### Health Check
- **GET** `/health`
  - Returns service health status
  - Response: `{ "status": "ok" }`
  - Used by Docker for health monitoring

## Core Responsibilities

1. **Event Routing**
   - Route events between all core system components
   - Maintain event queue integrity
   - Handle event prioritization

2. **State Synchronization**
   - Ensure consistent state across services
   - Manage state recovery mechanisms
   - Implement consistency checks

3. **System Orchestration**
   - Coordinate multi-service operations
   - Handle service communication failures
   - Manage system-wide state transitions

## Monitoring and Logging

### Logging
- JSON format logging with size limits
- Server startup and shutdown events
- Redis connection states
- Event routing metrics
- Error tracking and reporting

### Metrics
- Integrated with Prometheus for metrics collection
- Key metrics exposed for Grafana dashboards
- System health monitoring
- Event processing statistics

## TODO / Future Improvements

1. Implement comprehensive event handling logic per implementation plan
2. Add event validation middleware
3. Implement retry mechanisms for failed events
4. Enhance monitoring and logging
5. Create production Dockerfile
6. Add test coverage
7. Implement circuit breakers for service communication
8. Add documentation for event types and payload schemas
9. Implement rate limiting
10. Add metrics collection for monitoring

## Contributing

1. Follow the standard git workflow
2. Ensure all tests pass
3. Update documentation as needed
4. Follow existing code style and conventions 