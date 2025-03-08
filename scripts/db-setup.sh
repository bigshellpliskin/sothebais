#!/bin/bash

# Set the current directory to the project root
cd "$(dirname "$0")/.."

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  # Load only non-comment, non-empty lines
  export $(grep -v '^#' .env | grep -v '^$' | xargs -0 | tr '\0' '\n')
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

echo "🔹 Starting PostgreSQL container..."
docker compose up -d postgres

# Wait for PostgreSQL to be ready
echo "🔹 Waiting for PostgreSQL to be ready..."
sleep 5

# Maximum wait time in seconds
max_wait=30
wait_count=0

# Check PostgreSQL connection
while ! docker compose exec postgres pg_isready -U ${POSTGRES_USER:-postgres} > /dev/null 2>&1; do
  wait_count=$((wait_count+1))
  if [ $wait_count -gt $max_wait ]; then
    echo "Error: PostgreSQL did not become ready in time."
    exit 1
  fi
  echo "Waiting for PostgreSQL to be ready... ($wait_count/$max_wait)"
  sleep 1
done

echo "✅ PostgreSQL is ready!"

# Initialize database schema
echo "🔹 Initializing database schema..."
cd apps/shared/schema
npm run db:init:seed

if [ $? -eq 0 ]; then
  echo "✅ Database initialized successfully!"
else
  echo "❌ Database initialization failed!"
  exit 1
fi

echo "🚀 Database setup complete!" 