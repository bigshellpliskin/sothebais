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
│   │   ├── schema/        # Database schemas
│   │   │   ├── prisma/    # PostgreSQL schema (Prisma)
│   │   │   ├── redis/     # Redis schema definitions
│   │   │   └── README.md  # Schema documentation
│   │   └── types/         # TypeScript type definitions
│   │       ├── events.ts  # Event type definitions
│   │       ├── models.ts  # Model type definitions
│   │       ├── stream.ts  # Stream type definitions
│   │       └── README.md  # Types documentation
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
│   └── TODO.md            # Implementation tasks
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

Contains code that is used by multiple services:

- **schema/**: Database schema definitions (see [schema.md](schema.md) for details)
- **types/**: TypeScript type definitions for development-time type checking

### Data Storage (`data/`)

Contains persistent data for various services (see [architecture.md](architecture.md) for storage strategy).

## Documentation Map

For more detailed information, please refer to:

- [Requirements](requirements.md): System requirements and user stories
- [Architecture](architecture.md): System design and component interactions
- [Schema](schema.md): Database models and data structures
- [API Documentation](api-documentation.md): Service endpoints and interfaces
- [TODO](TODO.md): Implementation tasks and progress tracking

## Development Quick Start

1. Clone the repository
2. Copy `.env.example` to `.env` and configure environment variables
3. Run `docker-compose up` to start the development environment
4. Access the admin dashboard at `http://localhost:3000`

For Docker setup details, see the [architecture documentation](architecture.md#12-docker-implementation). 