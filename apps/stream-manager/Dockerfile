# syntax=docker/dockerfile:1

# Base stage with common dependencies
FROM node:18-alpine AS base
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    ffmpeg \
    curl \
    # Required for @napi-rs/canvas
    pixman-dev \
    pkgconfig \
    libc6-compat

# Development stage
FROM base AS development
# Copy package files
COPY package*.json ./
# Install dependencies
RUN npm install
# Copy source code
COPY . .
# Expose ports
EXPOSE 4200 4201 4290 4291
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4291/health || exit 1
# Start development server
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
# Copy package files
COPY package*.json ./
RUN npm ci
# Copy source code
COPY . .
# Build the application
RUN npm run build

# Production stage
FROM base AS production
# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production
# Copy built files from builder
COPY --from=builder /app/dist ./dist
# Create storage directory with proper permissions
RUN mkdir -p /app/storage && chown -R node:node /app/storage
# Switch to non-root user
USER node
# Expose ports
EXPOSE 4200 4201 4290 4291
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4291/health || exit 1
# Start production server
CMD ["npm", "run", "start"] 