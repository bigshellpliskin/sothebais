# syntax=docker/dockerfile:1

# Base stage with common dependencies
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# Development stage
FROM base AS development
# Install dependencies
COPY package*.json ./
RUN npm install
# Copy source code
COPY . .
# Expose ports (4400: Main API, 4401: WebSocket, 4490: Metrics, 4491: Health)
EXPOSE 4400 4401 4490 4491
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4491/health || exit 1
# Start development server with hot reload
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM base AS production
# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production
# Copy built files from builder
COPY --from=builder /app/dist ./dist
# Expose ports
EXPOSE 4400 4401 4490 4491
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4491/health || exit 1
# Start production server
CMD ["npm", "run", "start"]