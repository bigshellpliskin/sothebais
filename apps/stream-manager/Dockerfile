# Use Node.js 20 Alpine as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies required for canvas and other components
RUN apk add --no-cache \
    python3 \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    ffmpeg \
    curl \
    # Required for @napi-rs/canvas
    pixman-dev \
    giflib-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create storage directory and set permissions
RUN mkdir -p /app/storage && chown -R node:node /app

# Switch to non-root user
USER node

# Expose necessary ports
EXPOSE 4200 4201 4290 4291

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=30s --retries=3 \
    CMD curl -f -m 30 http://localhost:4291/health || exit 1

# Start the application
CMD ["npm", "run", "dev"] 