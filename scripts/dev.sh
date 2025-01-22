#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Build and start services in development mode
docker compose -f docker-compose.yaml \
    up --build -d

echo "Development environment is running!"
echo "Access the application at http://localhost:3000"
echo "Access Grafana at http://localhost:3001"
echo "Access Prometheus at http://localhost:9090"
echo "View logs with: ./scripts/logs.sh" 