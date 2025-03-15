# syntax=docker/dockerfile:1
# Note: This service uses a simple non-staged build approach.
FROM node:22-alpine
WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Create necessary directories including shared package
RUN mkdir -p /app/shared

# Copy TypeScript configurations
COPY tsconfig.base.json /tsconfig.base.json
COPY tsconfig.base.json /app/tsconfig.base.json

# Copy package files first
COPY apps/event-handler/package*.json ./
COPY apps/shared/package.json ../shared/

# Copy shared package files
COPY apps/shared/tsconfig.json ../shared/
COPY apps/shared/src ../shared/src
COPY apps/shared/dist ../shared/dist

# Install dependencies for both app and shared package
RUN npm install && cd ../shared && npm install && cd ../app

# Copy application code
COPY apps/event-handler/ ./

# Build the TypeScript code
RUN npm run build

# Expose ports (4300: Main API, 4301: Event Stream, 4390: Metrics, 4391: Health)
EXPOSE 4300 4301 4390 4391

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4391/health || exit 1

# Default command
CMD ["npm", "run", "start"] 