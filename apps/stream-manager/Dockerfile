# syntax=docker/dockerfile:1
FROM node:18-alpine
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

# Create necessary directories for nginx and shared types
RUN mkdir -p /tmp/hls && \
    mkdir -p /run/nginx && \
    mkdir -p /app/shared/types && \
    chown -R nginx:nginx /tmp/hls /run/nginx

# Copy package files and install dependencies
COPY apps/stream-manager/package*.json ./

# Copy shared types
COPY apps/shared/types ../shared/types

RUN npm install

# Copy all app files
COPY apps/stream-manager/ .

# Set up nginx and supervisor config
COPY apps/stream-manager/config/nginx.conf /etc/nginx/nginx.conf
COPY apps/stream-manager/config/supervisord.conf /etc/supervisord.conf

# Build the application
RUN npm run build

# Create storage directory
RUN mkdir -p /app/storage && chown -R node:node /app

# Expose all service ports
EXPOSE 1935 4200 4201 4290 4291 8080

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD nc -z localhost 4291

# Start both nginx and node app using supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"] 