# Deployment Configurations

This document outlines the different deployment configurations for the NFT Auction System.

## Environment Overview

| Feature | Local Dev | VPS Dev | VPS Prod |
|---------|-----------|----------|-----------|
| Purpose | Local development and testing | Staging and integration testing | Production deployment |
| Data Persistence | Ephemeral (volume mounts) | Semi-persistent | Fully persistent |
| Monitoring | Basic | Full suite | Full suite + Alerts |
| SSL/TLS | No | Optional | Required |
| Docker Config | docker-compose.dev.yaml | docker-compose.yaml | docker-compose.prod.yaml |
| Environment File | .env.dev | .env.dev | .env.prod |

## Local Development

### Setup
```bash
# Initial setup
./scripts/setup.sh --env dev

# Start services
docker-compose -f docker-compose.dev.yaml up
```

### Features
- Hot-reloading for development
- Source code mounted as volumes
- Debug ports exposed
- Local Redis instance
- Mock Shape L2 integration
- Development-specific logging

### Configuration
- Uses `.env.dev` for configuration
- All services run in development mode
- Prometheus/Grafana optional
- Local ports exposed directly

## VPS Development (Staging)

### Setup
```bash
# Initial setup
./scripts/vps-setup.sh --env dev
./scripts/deploy-vps.sh --env dev
```

### Features
- Full monitoring stack
- Semi-persistent storage
- Integration with test Shape L2 network
- Staging Twitter API integration
- Development-specific logging

### Configuration
- Uses `.env.dev` for configuration
- Monitoring enabled but without alerts
- Basic security measures
- Test API keys and endpoints

## VPS Production

### Setup
```bash
# Initial setup
./scripts/vps-setup.sh --env prod
./scripts/deploy-vps.sh --env prod
```

### Features
- Full monitoring stack with alerts
- Fully persistent storage
- Production Shape L2 integration
- Live Twitter API integration
- Production-grade logging
- Automated backups
- SSL/TLS encryption

### Configuration
- Uses `.env.prod` for configuration
- Full security measures
- Production API keys and endpoints
- Rate limiting enabled
- High availability configuration

## Directory Structure

```
├── docker-compose.yaml         # Base configuration
├── docker-compose.dev.yaml     # Development overrides
├── docker-compose.prod.yaml    # Production overrides
├── .env.example               # Example environment variables
├── .env.dev                   # Development environment
├── .env.prod                  # Production environment (git-ignored)
└── scripts/
    ├── setup.sh              # Local setup script
    ├── vps-setup.sh         # VPS initial setup
    └── deploy-vps.sh        # VPS deployment script
```

## Future CI/CD Pipeline (GitHub Actions)

### Planned Workflow

1. **On Pull Request**
   - Code linting
   - Unit tests
   - Integration tests
   - Docker build test
   - Security scanning

2. **On Merge to Development**
   - Build and tag Docker images
   - Push to container registry
   - Deploy to VPS Dev environment
   - Run smoke tests

3. **On Release Tag**
   - Build production Docker images
   - Push to container registry
   - Deploy to VPS Production
   - Run health checks
   - Notify team

### Security Considerations

- Secrets management via GitHub Secrets
- Environment-specific variables
- Infrastructure as Code
- Automated security scanning
- Backup verification

## Monitoring Configuration

### Development
- Basic metrics collection
- Local Grafana dashboards
- Debug-level logging

### Staging
- Full metrics collection
- Test alert configurations
- Enhanced logging
- Performance monitoring

### Production
- Full metrics collection
- Production alerts
- Log aggregation
- Performance monitoring
- Uptime tracking
- Resource utilization alerts
- Security monitoring

## Backup Strategy

### Development
- No automated backups
- Volume mounts for persistence

### Staging
- Daily backups
- 7-day retention
- Manual restore testing

### Production
- Hourly backups
- 30-day retention
- Automated restore testing
- Off-site backup storage
- Transaction log backups

## Security Measures

### Development
- Basic authentication
- Local network only

### Staging
- Basic SSL/TLS
- Firewall rules
- Authentication required
- Rate limiting

### Production
- Full SSL/TLS
- Strict firewall rules
- IP whitelisting
- Rate limiting
- DDoS protection
- Regular security audits
- Automated vulnerability scanning 