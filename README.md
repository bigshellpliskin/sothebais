# SothebAI's: NFT Social Livestream Auction System

A decentralized NFT auction system with VTuber integration, powered by Shape L2 and ElizaOS.

## System Overview

The system consists of several microservices:
- **Auction Manager**: Handles NFT lifecycle and bid processing
- **Event Handler**: Manages system-wide event orchestration
- **Stream Manager**: Handles Twitter integration and bid monitoring
- **Shape L2 Integration**: Manages blockchain interactions
- **ElizaOS**: VTuber character system and visual output

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 22 (for local development)
- Git
- (Optional) AWS CLI for backups

### Local Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd sothebais
```

2. Set up environment:
```bash
cp .env.example .env.dev
# Edit .env.dev with your configuration
```

3. Start development environment:
```bash
./scripts/setup.sh --env dev
docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml up
```

Development services will be available at:
- Admin Frontend: http://localhost:3000
- Auction Manager: http://localhost:4100
- Event Handler: http://localhost:4300
- Stream Manager: http://localhost:4200
- Shape L2: http://localhost:4000
- ElizaOS: http://localhost:4400
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090
- Redis: http://localhost:6379
- Adminer: http://localhost:6380

### VPS Development (Staging) Setup

1. Configure VPS:
```bash
./scripts/vps-setup.sh --env dev
```

2. Deploy services:
```bash
./scripts/deploy-vps.sh --env dev
```

### Production Setup

1. Configure production environment:
```bash
cp .env.example .env.prod
# Edit .env.prod with production values
```

2. Set up VPS:
```bash
./scripts/vps-setup.sh --env prod
```

3. Deploy to production:
```bash
./scripts/deploy-vps.sh --env prod
```

Production services will be available at:
- Admin Frontend: https://admin.${DOMAIN}
- Grafana: https://${MONITORING_DOMAIN}
- Prometheus: https://prometheus.${MONITORING_DOMAIN}

## Environment Configurations

| Environment | Purpose | Configuration |
|------------|---------|---------------|
| Local Dev | Development and testing | docker-compose.dev.yaml |
| VPS Dev | Staging and integration | docker-compose.yaml |
| Production | Live deployment | docker-compose.prod.yaml |

See [Deployment Configuration](docs/deployment-config.md) for detailed environment information.

## Monitoring

The system includes comprehensive monitoring:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and alerting
- **Node Exporter**: System metrics
- **Custom Metrics**: Application-specific monitoring

Access Grafana at:
- Local/Dev: http://localhost:3001
- Production: https://grafana.your-domain.com

## Development Tools

### Available Scripts
- `setup.sh`: Initial environment setup
- `dev.sh`: Start development environment
- `deploy-vps.sh`: Deploy to VPS
- `backup.sh`: Manage backups
- `logs.sh`: View service logs
- `cleanup.sh`: Clean up resources

### Development Features
- Hot reloading
- Debug endpoints
- Mock APIs
- Development tools (Adminer, Redis Commander)

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
- Volume mounts for persistence
- No automated backups

### Production
- Hourly backups to S3
- 30-day retention
- Transaction log backups
- Automated restore testing

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests: `./scripts/test.sh`
4. Submit PR

## License

[License Type] - See LICENSE file for details 
