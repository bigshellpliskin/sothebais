# syntax=docker/dockerfile:1
# Note: This service uses a simple non-staged build approach.
FROM node:22-alpine
WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy package files and install dependencies
COPY apps/auction-engine/package*.json ./
RUN npm install

# Copy application code
COPY apps/auction-engine/ .

# Build TypeScript code
RUN npm run build

# Expose ports
EXPOSE 4400 4490 4491

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4491/health || exit 1

# Default command
CMD ["npm", "run", "start"] 