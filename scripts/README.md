# NFT Auction Livestream Plugin Scripts

This directory contains scripts for managing different environments of the NFT Auction Livestream plugin for ElizaOS. The scripts handle local development, VPS staging, and production deployments of the auction system integrated with ElizaOS's streaming capabilities.

## System Components

The plugin system consists of several microservices:
- `auction-manager` - Handles NFT auction logic and smart contract interactions
- `event-handler` - Processes blockchain events and auction updates
- `stream-manager` - Manages livestream integration with ElizaOS
- `shape-l2` - Layer 2 blockchain interaction service
- `eliza` - ElizaOS integration service

Supporting services:
- `redis` - Caching and pub/sub
- `prometheus` - Metrics collection
- `grafana` - Monitoring dashboards

## Available Scripts

### Core Scripts

- `setup.sh` - Initial environment setup and dependency configuration
- `dev.sh` - Environment and service management
- `deploy.sh` - VPS deployment orchestration
- `cleanup.sh` - System maintenance and cleanup

## Environment Types

The system supports three deployment environments:
- `local` - Local development environment
- `vps-dev` - VPS staging environment for testing
- `vps-prod` - Production environment for live auctions

## Individual Script Usage

### setup.sh
Initial environment setup script. Run this first when setting up any environment.
```bash
./scripts/setup.sh [environment]  # environment: local|vps-dev|vps-prod
```
- Creates necessary directories for services
- Sets up environment files
- Configures SSL certificates
- Installs dependencies (pnpm packages)
- Sets appropriate permissions for ElizaOS integration

### dev.sh
Manages services and environments.
```bash
./scripts/dev.sh [command] [environment] [service] [lines]
```
Commands:
- `start` - Start auction and streaming services
- `stop` - Stop all services
- `restart` - Restart services
- `rebuild` - Rebuild and start services
- `logs` - View service logs
- `status` - Check service status
- `services` - List available services

### deploy.sh
Handles deployment to VPS environments.
```bash
./scripts/deploy.sh [environment]  # environment: vps-dev|vps-prod
```
- Creates deployment compose files
- Syncs code to VPS
- Sets up remote environment
- Rebuilds and starts auction services

### cleanup.sh
Maintenance and cleanup operations.
```bash
./scripts/cleanup.sh [options]
```
Options:
- `--all` - Clean everything
- `--docker` - Clean Docker resources
- `--workspace` - Clean workspace files
- `--compose` - Remove compose files

## Common Usage Patterns

### Local Development Setup
```bash
# Initial setup
./scripts/setup.sh local

# Start auction services
./scripts/dev.sh start local
```

### Testing on VPS
```bash
# Setup staging environment
./scripts/setup.sh vps-dev

# Deploy to staging
./scripts/deploy.sh vps-dev
```

### Production Deployment
```bash
# Prepare production environment
./scripts/setup.sh vps-prod

# Deploy to production
./scripts/deploy.sh vps-prod
```

### Maintenance Tasks

#### Regular Cleanup
```bash
# Clean workspace and Docker resources
./scripts/cleanup.sh --all
```

#### Service Management
```bash
# View auction manager logs
./scripts/dev.sh logs local auction-manager 100

# Rebuild staging environment
./scripts/dev.sh rebuild vps-dev
```

## Best Practices

1. **Environment Setup**
   - Always run `setup.sh` first for new environments
   - Configure environment files with correct blockchain and ElizaOS endpoints
   - Ensure SSL certificates are properly set for secure streaming

2. **Deployment**
   - Test auction functionality in staging before production
   - Verify smart contract addresses in environment files
   - Ensure ElizaOS integration points are correctly configured
   - Run cleanup before major deployments

3. **Maintenance**
   - Monitor auction and stream metrics in Grafana
   - Regularly clean Docker resources
   - Keep blockchain event handlers updated
   - Monitor ElizaOS integration logs

4. **Troubleshooting**
   - Check service logs for auction or streaming issues
   - Verify blockchain connectivity
   - Ensure ElizaOS services are accessible
   - Run cleanup and rebuild for fresh state

## Environment File Management

Each environment requires specific configuration:
- Local: `.env.dev` (local blockchain and ElizaOS endpoints)
- VPS Dev: `.env.vps-dev` (testnet configuration)
- VPS Prod: `.env.prod` (mainnet configuration)

Key configurations:
- Blockchain RPC endpoints
- Smart contract addresses
- ElizaOS API endpoints
- Stream configuration
- Redis and monitoring settings

## Security Notes

- Secure private keys and API credentials
- Restrict environment file permissions (600)
- Protect SSL certificates
- Never commit sensitive data to version control
- Use secure connections for VPS deployments 