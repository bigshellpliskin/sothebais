# syntax=docker/dockerfile:1

# Base stage with common dependencies
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# Development stage - uses local ts-node-dev from package.json
FROM base AS development
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 4400 4490 4491
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4491/health || exit 1
CMD ["npm", "run", "dev"]

# Build stage - builds TypeScript code
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage - uses built code
FROM base AS production
COPY package*.json ./
# Only install production dependencies
RUN npm ci --omit=dev
# Copy built files from build stage
COPY --from=build /app/dist ./dist
# Expose ports
EXPOSE 4400 4490 4491
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4491/health || exit 1
# Start production server
CMD ["npm", "run", "start"] 