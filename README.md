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
- Admin Frontend: http://localhost:3000 (https://admin.${DOMAIN} in prod)
- Auction Manager: http://localhost:4100
- Event Handler: http://localhost:4300
- Stream Manager: http://localhost:4200
- Shape L2: http://localhost:4000
- ElizaOS: http://localhost:4400
- Grafana: http://localhost:3001 (https://${MONITORING_DOMAIN} in prod)
- Prometheus: http://localhost:9090
- Redis: http://localhost:6379
- Adminer: http://localhost:6380

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
