#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Create production docker-compose file
cat docker-compose.yaml | \
    # Remove development-specific volumes
    grep -v '# Add these for development:' -A 4 | \
    # Set NODE_ENV to production only
    sed 's/NODE_ENV_ADDITIONAL=development//' \
    > docker-compose.prod.yaml

# Build and start services in production mode
docker compose -f docker-compose.prod.yaml \
    up --build -d

echo "Production environment is running!" 