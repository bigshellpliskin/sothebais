# syntax=docker/dockerfile:1

FROM node:20-alpine

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
    lsof \
    # Required for @napi-rs/canvas
    pixman-dev \
    pkgconfig \
    libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create storage directory with proper permissions
RUN mkdir -p /app/storage && chown -R node:node /app
USER node
RUN mkdir -p /app/storage

# Expose ports
EXPOSE 4200 4201 4290 4291

# Health check
HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:4291/health || exit 1

# Start server
CMD ["npm", "run", "dev"] 