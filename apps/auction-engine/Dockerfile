# syntax=docker/dockerfile:1
FROM node:22-alpine
WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy the base tsconfig file to the app directory
COPY tsconfig.base.json ./

# Set up packages lib first
WORKDIR /app/packages
COPY packages/package*.json ./
COPY packages/tsconfig.json ./
COPY packages/src ./src
RUN npm install && npm run build

# Set up the main app
WORKDIR /app/auction-engine
COPY apps/auction-engine/package*.json ./

# Install deps for main app (with path to packages package)
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