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
Service Access Information:
=================================

Admin Dashboard: https://admin.${DOMAIN}
Monitoring: https://${MONITORING_DOMAIN}
Prometheus: https://prometheus.${MONITORING_DOMAIN}

Internal Services:
- Auction Manager: :4100
- Event Handler: :4300
- Stream Manager: :4200
- Shape L2: :4000
- ElizaOS: :4400
- Redis: :6379

Default Grafana credentials: admin / ${GRAFANA_ADMIN_PASSWORD:-admin}
=================================" 