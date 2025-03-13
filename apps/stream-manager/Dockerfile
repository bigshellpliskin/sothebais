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

# Create necessary directories for nginx
RUN mkdir -p /tmp/hls && \
    mkdir -p /run/nginx && \
    chown -R nginx:nginx /tmp/hls /run/nginx

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all app files
COPY . .

# Set up nginx and supervisor config
COPY ./config/nginx.conf /etc/nginx/nginx.conf
COPY ./config/supervisord.conf /etc/supervisord.conf

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