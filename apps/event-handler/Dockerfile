# syntax=docker/dockerfile:1
# Note: This service uses a simple non-staged build approach.
FROM node:22-alpine
WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy workspace configuration and base tsconfig
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy packages first
COPY packages ./packages

# Copy event-handler app
COPY apps/event-handler ./apps/event-handler

# Install all dependencies and build packages
RUN npm install
RUN cd packages && npm run build

# Build event-handler
RUN cd apps/event-handler && npm run build

# Expose ports (4300: Main API, 4301: Event Stream, 4390: Metrics, 4391: Health)
EXPOSE 4300 4301 4390 4391

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4391/health || exit 1

# Default command
WORKDIR /app/apps/event-handler
CMD ["node", "dist/index.js"] 