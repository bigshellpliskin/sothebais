#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

# Pull latest changes
git pull

# Build and start services
docker-compose down
docker-compose build
docker-compose up -d

# Wait for services to be up
echo "Waiting for services to start..."
sleep 30

# Check service health
echo "Checking service health..."
docker-compose ps

# Print access information
echo "
=================================
Admin Dashboard Access:
=================================
Grafana: http://localhost:3001
Default credentials: admin / ${GRAFANA_PASSWORD:-admin}

Prometheus: http://localhost:9090

ElizaOS: http://localhost:3000
=================================" 