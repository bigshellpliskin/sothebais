# Use Node.js 20 Alpine as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies required for sharp and ffmpeg
RUN apk add --no-cache \
    python3 \
    build-base \
    g++ \
    ffmpeg \
    vips-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Create storage directory
RUN mkdir -p /app/storage && chown -R node:node /app

# Copy source code
COPY . .

# Switch to non-root user
USER node

# Expose necessary ports
EXPOSE 4200 4201 4290 4291

# Start the application
CMD ["npm", "run", "dev"] 