#!/bin/bash
set -e

# Create necessary directories
mkdir -p storage/db storage/data storage/characters monitoring/grafana/{dashboards,provisioning}

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file. Please update it with your configuration."
fi

# Ensure correct permissions
chmod +x scripts/*

echo "Setup completed successfully!" 