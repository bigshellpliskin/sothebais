#!/bin/bash

# Default values
ENVIRONMENT=${1:-vps-dev}

# Help message
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: ./deploy.sh [environment]"
    echo ""
    echo "Environments:"
    echo "  vps-dev     Deploy to VPS development environment (default)"
    echo "  vps-prod    Deploy to VPS production environment"
    exit 0
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(vps-dev|vps-prod)$ ]]; then
    echo "Invalid environment. Use 'vps-dev' or 'vps-prod'"
    exit 1
fi

# Set variables based on environment
case $ENVIRONMENT in
    "vps-dev")
        ENV_FILE=.env.vps-dev
        COMPOSE_FILE=docker-compose.vps-dev.yaml
        SSH_CONFIG="vps-dev"
        ;;
    "vps-prod")
        ENV_FILE=.env.prod
        COMPOSE_FILE=docker-compose.prod.yaml
        SSH_CONFIG="vps-prod"
        ;;
esac

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found"
    echo "Run ./setup.sh $ENVIRONMENT first"
    exit 1
fi

echo "Deploying to $ENVIRONMENT..."

# Create deployment compose file
echo "Creating deployment compose file..."
cat docker-compose.yaml > $COMPOSE_FILE

if [ "$ENVIRONMENT" == "vps-prod" ]; then
    # Production-specific modifications
    sed -i 's/NODE_ENV=development/NODE_ENV=production/' $COMPOSE_FILE
    # Remove development-specific volumes and settings
    sed -i '/# Development only start/,/# Development only end/d' $COMPOSE_FILE
fi

# Copy files to VPS
echo "Copying files to VPS..."
rsync -avz --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'storage' \
    ./ "$SSH_CONFIG:/opt/pliskin/"

# Execute remote commands
echo "Setting up remote environment..."
ssh "$SSH_CONFIG" "cd /opt/pliskin && \
    ./scripts/setup.sh $ENVIRONMENT && \
    ./scripts/dev.sh rebuild $ENVIRONMENT"

echo "Deployment to $ENVIRONMENT completed successfully!" 