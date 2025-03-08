#!/bin/bash

# Secure deployment script for SothebAIs (for cicd user)
# Usage: ./deploy.sh <version_tag>

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Error: Version tag is required"
  echo "Usage: ./deploy.sh <version_tag>"
  exit 1
fi

echo "Deploying SothebAIs version: $VERSION"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example"
  cp .env.example .env
  echo "Please update .env file with appropriate values"
  exit 1
fi

# Pull the latest Docker images
echo "Pulling Docker images..."
sudo docker compose pull

# Restart the services
echo "Restarting services..."
sudo docker compose down
sudo docker compose up -d

echo "Deployment completed successfully!"
echo "Services should be available at the configured domain."
echo "Check logs with: sudo docker compose logs -f" 