# syntax=docker/dockerfile:1

# Base stage with common dependencies
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# Development stage - useful for local development with hot reloading
FROM base AS development
COPY package*.json ./
# Always generate package-lock.json, then use npm ci for deterministic installs
RUN npm install --package-lock-only && npm ci
COPY . .
EXPOSE 4300 4301 4390 4391
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4391/health || exit 1
CMD ["npm", "run", "dev"]

# Production image
FROM base AS production
# Copy and install dependencies first (for better caching)
COPY package*.json ./
# Always generate package-lock.json, then use npm ci for deterministic installs
RUN npm install --package-lock-only && npm ci --omit=dev
# Copy source code
COPY . .
# Expose ports (4300: Main API, 4301: Event Stream, 4390: Metrics, 4391: Health)
EXPOSE 4300 4301 4390 4391
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4391/health || exit 1
# Start production server
CMD ["npm", "run", "start"] 