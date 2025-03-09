# SothebAI's: NFT Social Livestream Auction System

A decentralized NFT auction system with VTuber integration, powered by Shape L2 and ElizaOS.

## System Overview

The system consists of several microservices organized as independent applications:

- **Admin Frontend**: Next.js dashboard for system management and monitoring
- **Auction Engine**: Handles NFT lifecycle, auction logic, and bid processing
- **ElizaOS**: VTuber character system and visual composition for streams
- **Event Handler**: Manages system-wide event orchestration via Redis pub/sub
- **Stream Manager**: Manages Twitter/X integration, streams, and real-time interactions
- **Shared Services**: Common code, schemas, and type definitions used across services

## Project Structure

```
sothebais/
├── apps/                  # Application services
│   ├── admin/             # Admin dashboard frontend
│   ├── auction-engine/    # Auction logic service
│   ├── eliza/             # VTuber character system
│   ├── event-handler/     # Event processing service
│   ├── shared/            # Shared code and utilities
│   │   ├── schema/        # Database schemas
│   │   │   ├── prisma/    # PostgreSQL schema (Prisma)
│   │   │   ├── redis/     # Redis schema definitions
│   │   └── types/         # TypeScript type definitions
│   └── stream-manager/    # Stream management service
├── data/                  # Persistent data storage
├── docs/                  # Project documentation
├── .env                   # Environment variables (gitignored)
└── compose.yaml           # Docker Compose configuration
```

For complete documentation, see the [docs](./docs) directory.

## Technical Stack

- **Frontend**: Next.js, React
- **Backend**: Node.js with TypeScript
- **Data Storage**: 
  - PostgreSQL (via Prisma) for persistent data
  - Redis for real-time state and messaging
  - Docker volumes for asset storage
- **Deployment**: Docker & Docker Compose
- **Monitoring**: Prometheus & Grafana

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 22 (for local development)
- Git
- (Optional) AWS CLI for backups

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd sothebais
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the variables in `.env` according to your needs

3. Start the services:
```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d auction-engine

# Start with build
docker compose up -d --build

# Start with logs
docker compose up
```

Services will be available at:

### Port Allocation Strategy

Our port allocation follows a systematic approach for security, scalability, and ease of management:

#### Public Services (80-443)
- Traefik: 80, 443 (HTTP/HTTPS gateway)

#### Management & Monitoring (3000-3999)
- Admin Frontend: http://localhost:3000 (https://admin.${DOMAIN} in prod)
- Grafana: http://localhost:3001 (https://${MONITORING_DOMAIN} in prod)
- Traefik Dashboard: http://localhost:3100 (admin only)

#### Core Application Services (4000-4999)
Each service gets a 100-port range for main service and auxiliary endpoints:
- Auction Engine: 4100-4199
  - Main API: http://localhost:4100
  - Metrics: http://localhost:4190
  - Health: http://localhost:4191
- Stream Manager: 4200-4299
  - Main API: http://localhost:4200
  - WebSocket: http://localhost:4201
  - Metrics: http://localhost:4290
  - Health: http://localhost:4291
- Event Handler: 4300-4399
  - Main API: http://localhost:4300
  - Event Stream: http://localhost:4301
  - Metrics: http://localhost:4390
  - Health: http://localhost:4391
- ElizaOS: 4400-4499
  - Main API: http://localhost:4400
  - WebSocket: http://localhost:4401
  - Metrics: http://localhost:4490
  - Health: http://localhost:4491

#### Infrastructure Services (6000-9999)
- Redis: http://localhost:6379 (standard Redis port)
- PostgreSQL: http://localhost:5432 (standard PostgreSQL port)
- Adminer: http://localhost:6380 (database management)
- Prometheus: http://localhost:9090 (metrics collection)
- Node Exporter: http://localhost:9100 (system metrics)

#### Port Range Conventions
- xx90: Prometheus metrics endpoint
- xx91: Health check endpoint
- xx01: WebSocket/Stream endpoint (if applicable)
- Main service port ends in 00

#### Development vs Production
- Development: All ports are exposed as listed above
- Production: Only ports 80/443 exposed publicly, all internal communication via Docker network

## Data Storage Strategy

The system uses a hybrid approach to data management:

1. **PostgreSQL** (via Prisma)
   - Persistent, relational data (users, auctions, bids, etc.)
   - Historical records and analytics data

2. **Redis**
   - Real-time state (active auctions, streams)
   - Event pub/sub for inter-service communication
   - Caching and rate limiting

3. **File System** (Docker Volumes)
   - Stream assets and media files
   - Config files and certificates

## Service Management

### Available Commands
```bash
# View service logs
docker compose logs auction-engine
docker compose logs auction-engine --tail=100 -f

# Check service status
docker compose ps

# Stop services
docker compose stop
docker compose stop auction-engine

# Restart services
docker compose restart
docker compose restart auction-engine

# Tear down everything
docker compose down

# Tear down and remove volumes
docker compose down -v
```

## Environment Configurations

The system is designed to run in both development and production environments using the same Docker Compose configuration, with environment variables controlling the behavior.

See [Architecture Document](docs/architecture.md) for detailed environment information.

## Monitoring

The system includes comprehensive monitoring:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and alerting
- **Node Exporter**: System metrics
- **Custom Metrics**: Application-specific monitoring

Monitoring is automatically enabled for all environments.

## Security

### Development
- Basic authentication
- Local network only

### Production
- SSL/TLS encryption
- IP whitelisting
- Rate limiting
- DDoS protection
- Regular security audits

## Backup Strategy

### Data Backup
```bash
# PostgreSQL backup
docker compose exec postgres pg_dump -U postgres sothebais > backup_$(date +%Y%m%d).sql

# Redis backup
docker compose exec redis redis-cli SAVE

# Full data directory backup
tar -czvf data_backup_$(date +%Y%m%d).tar.gz data/
```

For production environments, consider setting up cron jobs for automated backups.

## Implementation Plan

Development is organized into phases:

1. **Phase 0: Setup & Infrastructure**
   - Repository setup
   - Development environment configuration
   - Docker and tooling setup

2. **Phase 1: Foundation**
   - Data layer implementation
   - Core service containers
   - Basic communication between services

3. **Phase 2: Core System**
   - Auction engine functionality
   - Stream management
   - Event processing system

4. **Phase 3: Complete Product**
   - ElizaOS integration
   - UI refinement
   - Performance optimization

See [Implementation Plan](docs/implementation-plan.md) for detailed development roadmap.

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests
4. Submit PR

## License

[License Type] - See LICENSE file for details

## Git Repository
This repository was initialized on March 13, 2024. The codebase is now properly tracked with Git using the `main` branch as the primary development branch. 
