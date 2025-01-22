#!/bin/bash
set -e

SERVICE=${1:-eliza}

echo "Restarting $SERVICE..."

# Rebuild and restart the specified service
docker compose up -d --build $SERVICE

echo "$SERVICE has been restarted!" 