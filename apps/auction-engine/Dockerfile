# syntax=docker/dockerfile:1
FROM node:22-alpine
WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Create a simpler structure where shared is under the app
# No need to maintain monorepo structure in container

# Copy just the TypeScript config
COPY tsconfig.base.json ./

# Set up shared lib first
WORKDIR /app/shared
COPY apps/shared/package*.json ./
COPY apps/shared/tsconfig.json ./
COPY apps/shared/src ./src
RUN npm install && npm run build

# Set up the main app
WORKDIR /app/auction-engine
COPY apps/auction-engine/package*.json ./

# Install deps for main app (with path to shared package)
RUN npm install

# Copy app source code
COPY apps/auction-engine/src ./src
COPY apps/auction-engine/tsconfig.json ./

# Build TypeScript code
RUN npm run build

# Expose ports
EXPOSE 4400 4490 4491

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4491/health || exit 1

# Default command
CMD ["npm", "run", "start"] 