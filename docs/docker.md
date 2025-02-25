# Docker Setup for SothebAIs

This document explains the Docker setup for the SothebAIs project, including how to use Docker and Docker Compose to run the different services.

## Project Structure

The project uses a microservices architecture with the following components:

- **admin-frontend**: Next.js admin dashboard
- **stream-manager**: Manages live streams and WebSocket connections
- **event-handler**: Processes system events
- **auction-engine**: Handles auction logic
- **redis**: Used for caching and message queue
- **traefik**: Reverse proxy for routing requests

## Docker Files

Each service has its own Dockerfile located in its respective directory:

- `apps/admin/Dockerfile`: Admin frontend
- `apps/stream-manager/Dockerfile`: Stream manager service
- `apps/event-handler/Dockerfile`: Event handler service
- `apps/auction-engine/Dockerfile`: Auction engine service
- `apps/eliza/Dockerfile`: Eliza service

The main Docker Compose file is located at the root of the project:

- `compose.yaml`: Defines all services and their configurations

## Running the Project

### Prerequisites

- Docker and Docker Compose installed
- `.env` file with required environment variables

### Starting the Services

To start all services:

```bash
docker compose up -d
```

To start specific services:

```bash
docker compose up -d admin-frontend stream-manager
```

### Stopping the Services

To stop all services:

```bash
docker compose down
```

To stop and remove volumes:

```bash
docker compose down -v
```

## Development Workflow

For development, you can use the following workflow:

1. Make changes to the code
2. Rebuild the affected service:
   ```bash
   docker compose build service-name
   ```
3. Restart the service:
   ```bash
   docker compose up -d --no-deps service-name
   ```

## Environment Variables

The project uses environment variables for configuration. These can be set in a `.env` file at the root of the project. Key variables include:

- `NODE_ENV`: Environment (development, production)
- `DOMAIN`: Main domain for the application
- `REDIS_PASSWORD`: Password for Redis
- Various port configurations for each service

## Data Persistence

Persistent data is stored in the following locations:

- Redis data: Docker volume `redis_data`
- Stream manager data: `./data/stream-manager`
- Event handler data: `./data/event-handler`
- Traefik certificates: `./data/traefik/letsencrypt`

## Networking

All services are connected to the `auction_net` network, allowing them to communicate with each other. Traefik handles routing of external requests to the appropriate services.

## Monitoring and Health Checks

Each service includes health checks to ensure they are running properly. You can monitor the health of services using:

```bash
docker compose ps
```

For more detailed logs:

```bash
docker compose logs -f [service-name]
```

## Troubleshooting

If you encounter issues:

1. Check the logs: `docker compose logs -f service-name`
2. Verify environment variables are set correctly
3. Ensure all required services are running
4. Check network connectivity between services
5. Restart the problematic service: `docker compose restart service-name` 