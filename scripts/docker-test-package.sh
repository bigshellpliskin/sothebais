#!/bin/bash

# Script to test the package exports in a Docker container
# This helps verify if the Docker volume mounts and paths are correctly set up

# Set the current directory to the project root
cd "$(dirname "$0")/.."

# Skip loading environment variables to avoid issues
echo "🐳 Testing package in Docker environment..."

# Run the test in a Docker container
docker run --rm \
  -v "$(pwd)/packages:/app/packages" \
  -v "$(pwd)/scripts:/app/scripts" \
  -v "$(pwd)/package.json:/app/package.json" \
  -e "DOCKER_CONTEXT=true" \
  -w /app \
  node:22 \
  node scripts/test-package.js

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Docker package test passed successfully!"
else
  echo "❌ Docker package test failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE 