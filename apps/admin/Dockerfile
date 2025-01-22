# Use Node.js 20 Alpine as base
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache docker-cli

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 