# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    build-base \
    g++ \
    vips-dev \
    git

# Set up Node.js app
WORKDIR /app
COPY package*.json ./
# Always generate package-lock.json, then use npm ci for deterministic installs
RUN npm install --package-lock-only && npm ci

# Copy app source
COPY . .

# Build the app
RUN npm run build

# Development stage
FROM node:18-alpine AS development

# Install runtime dependencies
RUN apk add --no-cache \
    nginx \
    nginx-mod-rtmp \
    netcat-openbsd \
    supervisor \
    ffmpeg \
    vips \
    git

# Set up nginx configuration
COPY apps/stream-manager/config/nginx.conf /etc/nginx/nginx.conf

# Create necessary directories
RUN mkdir -p /tmp/hls && \
    mkdir -p /run/nginx && \
    chown -R nginx:nginx /tmp/hls /run/nginx

# Set up Node.js app
WORKDIR /app
COPY package*.json ./
# Always generate package-lock.json, then use npm ci for deterministic installs
# Don't use --only=production to ensure dev dependencies are installed
RUN npm install --package-lock-only && npm ci

# Copy app source and configs
COPY . .
COPY apps/stream-manager/config/supervisord.conf /etc/supervisord.conf

# Verify that development tools are installed
RUN npm list tsx || npm install -g tsx

# Create storage directory
RUN mkdir -p /app/storage && chown -R node:node /app

# Expose all service ports
EXPOSE 1935 4200 4201 4290 4291 8080

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD nc -z localhost 4291

# Start both nginx and node app using supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    nginx \
    nginx-mod-rtmp \
    netcat-openbsd \
    supervisor \
    ffmpeg \
    vips

# Set up nginx configuration
COPY apps/stream-manager/config/nginx.conf /etc/nginx/nginx.conf

# Create necessary directories
RUN mkdir -p /tmp/hls && \
    mkdir -p /run/nginx && \
    chown -R nginx:nginx /tmp/hls /run/nginx

# Set up Node.js app
WORKDIR /app

# Copy built app from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/package-lock.json ./
RUN npm ci --only=production

# Copy configs
COPY apps/stream-manager/config/supervisord.conf /etc/supervisord.conf

# Create storage directory
RUN mkdir -p /app/storage && chown -R node:node /app

# Expose all service ports
EXPOSE 1935 4200 4201 4290 4291 8080

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD nc -z localhost 4291

# Start both nginx and node app using supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"] 