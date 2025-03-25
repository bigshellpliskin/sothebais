# syntax=docker/dockerfile:1
FROM node:22-alpine
WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy workspace configuration and base tsconfig
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy packages first
COPY packages ./packages

# Copy admin app
COPY apps/admin ./apps/admin

# Install all dependencies and build packages
RUN npm install
RUN cd packages && npm run build

# Build admin
RUN cd apps/admin && npm run build

# Expose ports (4500: Main API, 4590: Metrics, 4591: Health)
EXPOSE 4500 4590 4591

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4591/health || exit 1

# Default command
WORKDIR /app/apps/admin
CMD ["node", "dist/index.js"] 