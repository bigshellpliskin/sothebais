# SothebAIs Project Structure

This document provides an overview of the SothebAIs project structure, explaining the organization of code and resources.

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
│   ├── docker.md          # Docker setup documentation
│   ├── project-structure.md # This file
│   └── schema.md          # Schema documentation
├── .env                   # Environment variables (gitignored)
├── .env.example           # Example environment variables
├── compose.yaml           # Docker Compose configuration
└── README.md              # Project overview
```

## Key Components

### Application Services (`apps/`)

- **admin**: Next.js admin dashboard for managing the system
- **auction-engine**: Handles auction logic, bid processing, and NFT lifecycle
- **eliza**: VTuber character system and visual output
- **event-handler**: Processes system events and orchestrates communication
- **stream-manager**: Manages live streams and WebSocket connections
- **shared**: Common code used across multiple services

### Shared Code (`apps/shared/`)

The shared directory contains code that is used by multiple services:

#### Schema (`apps/shared/schema/`)

Contains database schema definitions:

- **prisma**: PostgreSQL schema using Prisma ORM
- **redis**: Redis schema definitions including key patterns and data structures

#### Types (`apps/shared/types/`)

Contains TypeScript type definitions:

- **events.ts**: Defines event types used throughout the system
- **models.ts**: Defines model interfaces for database entities
- **stream.ts**: Defines stream configuration and state types

### Data Storage (`data/`)

Contains persistent data for various services:

- **event-handler**: Data stored by the event handler service
- **stream-manager**: Data stored by the stream manager service
- **traefik**: Traefik configuration and SSL/TLS certificates

### Documentation (`docs/`)

Contains project documentation:

- **docker.md**: Docker setup and usage documentation
- **project-structure.md**: This file, explaining the project structure
- **schema.md**: Documentation for database schemas and data models

## Code Organization Principles

### Microservices Architecture

The project follows a microservices architecture, with each service having its own:
- Codebase
- Dockerfile
- API endpoints
- Responsibility domain

### Shared Code Strategy

To avoid duplication, common code is placed in the `shared` directory:
- **Types**: TypeScript interfaces for type checking during development
- **Schemas**: Database schema definitions for runtime data validation
- **Utilities**: Helper functions and common logic

### Separation of Concerns

- **Types vs. Schemas**: Types are for development-time checking, schemas define runtime data structure
- **Service Boundaries**: Each service has a clear responsibility and API contract
- **Data Flow**: Events are used for communication between services

## Development Workflow

1. Make changes to service code in the appropriate `apps/` directory
2. Update shared types/schemas if needed
3. Use Docker Compose to build and run the affected services
4. Test changes locally
5. Deploy to staging/production

## Further Reading

- [Docker Setup](docker.md): Details on Docker configuration
- [Schema Documentation](schema.md): Information about data models and schemas 