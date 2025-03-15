# Environment Setup Guide

This document outlines how to run the SothebAIs system in different environments: local development, local production testing, and CI/CD production deployment.

## Table of Contents

- [1. Local Development Environment](#1-local-development-environment)
- [2. Local Production Environment](#2-local-production-environment)
- [3. CI/CD Production Environment](#3-cicd-production-environment)
- [4. Configuration Management](#4-configuration-management)
- [5. Troubleshooting](#5-troubleshooting)

## 1. Local Development Environment

### Overview

The local development environment prioritizes developer experience with hot-reloading, exposed ports, mounted source directories, and debugging tools.

### Configuration

- **Docker Compose**: Use standard `compose.yaml` without production flags
- **Node Environment**: `NODE_ENV=development`
- **Docker Volumes**: Mount source code directories for live reloading
- **Commands**: Use development commands (dev, debug)
- **TypeScript**: Use `ts-node-dev` for faster development experience

### Setup Steps

1. **Clone the Repository**:
   ```bash
   git clone git@github.com:your-org/sothebais.git
   cd sothebais
   ```

2. **Create Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your local settings
   ```

3. **Start All Services**:
   ```bash
   docker compose up -d
   ```

4. **Start Specific Services Only**:
   ```bash
   docker compose up -d admin-frontend stream-manager
   ```

5. **View Logs**:
   ```bash
   docker compose logs -f [service-name]
   ```

### Service-Specific Development Configuration

| Service | Command | Features |
|---------|---------|----------|
| admin-frontend | `npm run dev` | Hot reloading, source mapping |
| stream-manager | `npm run debug:stream` | Debug logging, source mapping |
| event-handler | `npm run start` | Built from source with debug info |
| auction-engine | `npm run start` | Built from source with debug info |

### Development-Specific Volume Mounts

Docker Compose mounts source directories as read-only volumes to enable hot-reloading:

```yaml
volumes:
  - ./apps/service-name/src:/app/src:ro     # Source code for hot reloading
  - ./apps/service-name/package.json:/app/package.json:ro
  - ./data/service-name:/app/storage:rw     # Persistent data
```

## 2. Local Production Environment

### Overview

Local production environment mimics the actual production setup but runs locally for testing deployment configurations, performance benchmarking, and integration testing.

### Configuration

- **Docker Compose**: Use with production profile
- **Node Environment**: `NODE_ENV=production`
- **Docker Volumes**: Only mount necessary runtime volumes, not source code
- **Commands**: Use production commands (start)
- **TypeScript**: Pre-compiled, running optimized JavaScript

### Setup Steps

1. **Create Production Environment File**:
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production-like settings
   ```

2. **Build Production Images**:
   ```bash
   docker compose -f compose.yaml --profile prod build
   ```

3. **Start Services in Production Mode**:
   ```bash
   docker compose -f compose.yaml --profile prod --env-file .env.production up -d
   ```

### Adding Production Profile to Compose File

Add the following to your `compose.yaml` for each service:

```yaml
services:
  admin-frontend:
    profiles: ["dev", "prod"]
    # Additional production-specific settings
    environment:
      - NODE_ENV=production
    # No source mounts in production
```

## 3. CI/CD Production Environment

### Overview

The CI/CD production environment is for the actual deployed system, built and deployed through automated pipelines.

### Configuration

- **Build Process**: GitHub Actions workflows
- **Deployment**: Docker images pushed to registry and pulled by production server
- **Environment**: Fully isolated, containerized, with secrets managed safely
- **Configuration**: Environment variables injected at runtime

### CI/CD Pipeline Steps

1. **Build and Test**:
   - Checkout code
   - Setup Docker Buildx
   - Build Docker images using project root as context
   - Push images to container registry (GitHub Container Registry)

2. **Deploy to Production**:
   - SSH into production server
   - Pull latest Docker images
   - Update environment variables
   - Restart services with new images

### CI/CD Configuration Files

The repository includes several GitHub Actions workflow files:

- `.github/workflows/docker-build.yml`: Builds and pushes Docker images
- `.github/workflows/ci.yml`: Runs tests and linting
- `.github/workflows/deploy.yml`: Deploys to production server

## 4. Configuration Management

### TypeScript Configuration

#### Base Configuration

The project uses a base TypeScript configuration in the root directory:

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "strict": true,
    // Additional base options...
  }
}
```

#### Service-Specific Configuration

Each service extends the base configuration with service-specific settings:

```json
// apps/service-name/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Package.json Scripts

Each service maintains consistent script naming conventions:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --esm src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "debug:stream": "NODE_ENV=development DEBUG=* ts-node-dev --respawn src/index.ts",
    "lint": "eslint . --ext .ts",
    "test": "jest"
  }
}
```

### Docker Configuration

Each service has its own Dockerfile that is designed to work with the project root as the build context:

```dockerfile
# apps/service-name/Dockerfile
FROM node:20-alpine
WORKDIR /app

# Copy shared dependencies and service-specific files
COPY tsconfig.base.json ../../tsconfig.base.json
COPY apps/service-name/package*.json ./
COPY apps/shared/src ../shared/src  # Copy shared package source
COPY apps/shared/package.json ../shared/package.json  # Copy shared package definition

# Install dependencies and build
RUN npm install
COPY apps/service-name/ ./
RUN npm run build

# Set command and expose ports
EXPOSE service-specific-ports
CMD ["npm", "run", "start"]
```

## 5. Troubleshooting

### Common Issues

1. **Port Conflicts**:
   - Check for other services using the same ports
   - Use `docker ps` to identify containers with port conflicts
   - Change port mappings in `.env` file

2. **Shared Package Errors**:
   - Ensure the shared package is copied correctly into Docker containers
   - Check that Dockerfiles include the `COPY apps/shared/src ../shared/src` step
   - Verify import paths use the correct format: `@sothebais/shared/utils/logger.js`
   - Make sure imports include the `.js` extension even for TypeScript files

3. **Volume Mount Issues**:
   - Check that source directories are correctly mounted
   - Ensure file permissions are correct
   - Try restarting Docker or the Docker daemon

4. **Command Errors**:
   - Verify package.json scripts match the commands in Docker Compose
   - Check logs for specific error messages
   - Try running the command directly in the container with `docker compose exec`

### Debugging Tools

1. **Docker Compose Logs**:
   ```bash
   docker compose logs -f service-name
   ```

2. **Inspecting Containers**:
   ```bash
   docker compose exec service-name sh
   ```

3. **Checking Container Environment**:
   ```bash
   docker compose exec service-name env
   ```

4. **Restart Individual Services**:
   ```bash
   docker compose restart service-name
   ```

5. **Rebuild Service Images**:
   ```bash
   docker compose build --no-cache service-name
   ``` 