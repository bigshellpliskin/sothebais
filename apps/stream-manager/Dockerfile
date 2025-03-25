# syntax=docker/dockerfile:1
FROM node:22-alpine
WORKDIR /app

# Install all dependencies
RUN apk add --no-cache \
    python3 \
    build-base \
    g++ \
    vips-dev \
    git \
    nginx \
    nginx-mod-rtmp \
    netcat-openbsd \
    supervisor \
    ffmpeg \
    vips

# Create necessary directories for nginx
RUN mkdir -p /tmp/hls && \
    mkdir -p /run/nginx && \
    chown -R nginx:nginx /tmp/hls /run/nginx

# Copy workspace configuration and base tsconfig
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy packages first
COPY packages ./packages

# Copy stream-manager app
COPY apps/stream-manager ./apps/stream-manager

# Install all dependencies and build packages
RUN npm install
RUN cd packages && npm run build

# Install tsx globally
RUN npm install -g tsx

# Set up nginx and supervisor config
COPY apps/stream-manager/config/nginx.conf /etc/nginx/nginx.conf
COPY apps/stream-manager/config/supervisord.conf /etc/supervisord.conf

# Build the application
RUN cd apps/stream-manager && npm run build

# Create storage directory
RUN mkdir -p /app/apps/stream-manager/storage && chown -R node:node /app

# Expose all service ports
EXPOSE 1935 4200 4201 4290 4291 8080

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD nc -z localhost 4291

# Set working directory to stream-manager app
WORKDIR /app/apps/stream-manager

# Start both nginx and node app using supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"] 