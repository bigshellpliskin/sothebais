# SothebAI's: NFT Social Livestream Auction System

A decentralized NFT auction system with VTuber integration, powered by Shape L2 and ElizaOS.

## System Overview

The system consists of several microservices:
- **Auction Manager**: Handles NFT lifecycle and bid processing
- **Event Handler**: Manages system-wide event orchestration
- **Stream Manager**: Handles Twitter integration and bid monitoring
- **Shape L2 Integration**: Manages blockchain interactions
- **ElizaOS**: VTuber character system and visual output
- **Admin Frontend**: Service managment and monitoring


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

2. Initialize the environment:
```bash
# For local development
./run.sh setup local --stage dev

# For production deployment
./run.sh setup vps --stage prod
```

3. Configure environment variables:
   - The setup script will create a `.env` file from `.env.example`
   - Update the variables in `.env` according to your needs
   - For production, make sure to configure SSL/TLS, monitoring, and backup settings

4. Start the services:
```bash
# Start all services locally
./run.sh start local --stage dev

# Start specific service
./run.sh start local --stage dev --service auction-manager

# Start production services
./run.sh start vps --stage prod
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
- Shape L2: 4000-4099
  - Main API: http://localhost:4000
  - Metrics: http://localhost:4090
  - Health: http://localhost:4091
- Auction Manager: 4100-4199
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
- Staging: Limited port exposure based on testing needs

## Environment Management

### Available Commands
```bash
# View service logs
./run.sh logs local --service auction-manager --lines 100

# Check service status
./run.sh status local

# Create backups
./run.sh backup local --type full    # full backup
./run.sh backup local --type db      # database only
./run.sh backup local --type logs    # logs only

# Clean up resources
./run.sh clean local --clean all     # clean everything
./run.sh clean local --clean docker  # clean docker resources
./run.sh clean local --clean data    # clean data directory

# Restart services
./run.sh restart local --stage dev
```

## Environment Configurations

| Environment | Purpose | Stage | Usage |
|------------|---------|-------|--------|
| Local | Development and testing | dev | ./run.sh start local --stage dev |
| VPS Dev | Staging and integration | dev | ./run.sh start vps --stage dev |
| Production | Live deployment | prod | ./run.sh start vps --stage prod |

See [Deployment Configuration](docs/deployment-config.md) for detailed environment information.

## Monitoring

The system includes comprehensive monitoring:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and alerting
- **Node Exporter**: System metrics
- **Custom Metrics**: Application-specific monitoring

Monitoring is automatically enabled in production environments.

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

### Development
- Manual backups via `./run.sh backup local`
- Volume mounts for persistence

### Production
- Automated hourly backups
- 30-day retention
- Transaction log backups
- Automated restore testing

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests
4. Submit PR

## License

[License Type] - See LICENSE file for details

## Git Repository
This repository was initialized on March 13, 2024. The codebase is now properly tracked with Git using the `main` branch as the primary development branch. 
