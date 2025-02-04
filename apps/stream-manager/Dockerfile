# Use Node.js Alpine as base
FROM node:18-alpine

# Install nginx with RTMP module and other required packages
RUN apk add --no-cache \
    nginx \
    nginx-mod-rtmp \
    netcat-openbsd \
    supervisor \
    python3 \
    build-base \
    g++ \
    ffmpeg \
    vips-dev

# Set up nginx configuration
COPY config/nginx.conf /etc/nginx/nginx.conf

# Create necessary directories
RUN mkdir -p /tmp/hls && \
    mkdir -p /run/nginx && \
    chown -R nginx:nginx /tmp/hls /run/nginx

# Set up Node.js app
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copy app source and configs
COPY . .
COPY config/supervisord.conf /etc/supervisord.conf

# Create storage directory
RUN mkdir -p /app/storage && chown -R node:node /app

# Expose all service ports
EXPOSE 1935 4200 4201 4290 4291 8080

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD nc -z localhost 4291

# Start both nginx and node app using supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"] 