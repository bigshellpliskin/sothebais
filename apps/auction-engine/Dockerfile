# syntax=docker/dockerfile:1

# Base stage with common dependencies
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# Development stage - useful for local development with hot reloading
FROM base AS development
COPY package*.json ./
# Use --package-lock-only first to update package-lock without installing
RUN npm install --package-lock-only
RUN npm install
COPY . .
EXPOSE 4100 4190 4191
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4191/health || exit 1
CMD ["npm", "run", "dev"]

# Production image - builds TypeScript and creates production image
FROM base AS production
# Copy package files and install dependencies
COPY package*.json ./
# Use --package-lock-only first to update package-lock without installing
RUN npm install --package-lock-only
RUN npm install
# Copy source code
COPY . .
# Build TypeScript
RUN npm run build
# Prune development dependencies after build
RUN npm install --omit=dev
# Expose ports
EXPOSE 4100 4190 4191
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4191/health || exit 1
# Start production server
CMD ["npm", "run", "start"] 