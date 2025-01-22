#!/bin/bash
set -e

echo "Cleaning up Docker resources..."

# Stop all containers
docker compose down

# Remove all volumes
docker compose down -v

# Remove production compose file if it exists
rm -f docker-compose.prod.yaml

# Optionally remove built images (uncomment if needed)
# docker image prune -af

echo "Cleanup completed!" 