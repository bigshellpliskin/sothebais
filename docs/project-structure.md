# SothebAIs Project Structure

This document provides a concise overview of the SothebAIs project's directory structure and codebase organization. For detailed system design, please refer to the [architecture documentation](architecture.md).

## Directory Structure

```
sothebais/
├── apps/                  # Application services
│   ├── admin/             # Admin dashboard frontend
│   ├── auction-engine/    # Auction logic service
│   ├── eliza/             # VTuber character system
│   ├── event-handler/     # Event processing service
│   ├── shared/            # Shared code and utilities
│   │   ├── dist/          # Built output
│   │   ├── src/           # Source code
│   │   │   ├── types/     # Type definitions
│   │   │   ├── schema/    # Database schemas and models
│   │   │   ├── utils/     # Utility functions
│   │   │   └── index.ts   # Main entry point that re-exports everything
│   │   ├── package.json   # Single package definition
│   │   └── tsconfig.json  # TypeScript configuration
│   └── stream-manager/    # Stream management service
├── data/                  # Persistent data storage
│   ├── event-handler/     # Event handler data
│   ├── stream-manager/    # Stream manager data
│   └── traefik/           # Traefik configuration and certificates
├── docs/                  # Project documentation
│   ├── requirements.md    # System requirements
│   ├── architecture.md    # System architecture
│   ├── schema.md          # Database schema documentation
│   ├── api-documentation.md # API endpoints
│   ├── project-structure.md # This file
│   ├── environment-setup.md # Environment setup guide
│   └── implementation-plan.md # Implementation tasks
├── .env                   # Environment variables (gitignored)
├── .env.example           # Example environment variables
├── compose.yaml           # Docker Compose configuration
└── README.md              # Project overview
```

## Key Components

### Application Services (`apps/`)

Each service is implemented as a separate application with its own codebase and Docker container:

- **admin**: Next.js admin dashboard for managing the system
- **auction-engine**: Handles auction logic and bid processing
- **eliza**: VTuber character system and visual output
- **event-handler**: Processes system events and orchestrates communication
- **stream-manager**: Manages live streams and WebSocket connections
- **shared**: Common code used across multiple services

### Shared Code (`apps/shared/`)

Contains code that is used by multiple services in a single consolidated package:

- **src/types/**: TypeScript type definitions (events, models, stream, etc.)
- **src/schema/**: Database schema definitions (PostgreSQL/Prisma, Redis)
- **src/utils/**: Shared utility functions (logging, etc.)
- **src/index.ts**: Main entry point that re-exports everything for easy importing

The shared package is designed for consistent imports using the pattern:
```typescript
// Example import pattern
import { createLogger } from '@sothebais/shared/utils/logger.js';
import type { StreamState } from '@sothebais/shared/types/stream.js';
```

### Data Storage (`data/`)

Contains persistent data for various services (see [architecture.md](architecture.md) for storage strategy).

## Documentation Map

For more detailed information, please refer to:

- [Requirements](requirements.md): System requirements and user stories
- [Architecture](architecture.md): System design and component interactions
- [Schema](schema.md): Database models and data structures
- [API Documentation](api-documentation.md): Service endpoints and interfaces
- [Environment Setup](environment-setup.md): Guide for running in different environments
- [Implementation Plan](implementation-plan.md): Implementation tasks and progress tracking

## Development Quick Start

1. Clone the repository
2. Copy `.env.example` to `.env` and configure environment variables
3. Run `docker compose up -d` to start the development environment
4. Access the admin dashboard at `http://localhost:3000`

For detailed Docker and environment setup, see the [environment setup guide](environment-setup.md). 