FROM node:22-alpine
WORKDIR /app

# Install dependencies including health check utilities
RUN apk add --no-cache curl netcat-openbsd

# Create necessary directories including shared package 
RUN mkdir -p /app/shared

# Copy TypeScript configurations
COPY tsconfig.base.json /tsconfig.base.json
COPY tsconfig.base.json /app/tsconfig.base.json

# Copy package files first
COPY apps/admin/package*.json ./
COPY apps/shared/package.json ../shared/

# Copy shared package files
COPY apps/shared/tsconfig.json ../shared/
COPY apps/shared/src ../shared/src

# Install dependencies and build the shared package
RUN npm install && cd ../shared && npm install && npm run build && cd ../app

# Copy the admin application
COPY apps/admin/ ./

# Add node_modules/.bin to PATH and set other environment variables
ENV PATH="/app/node_modules/.bin:$PATH" \
    NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Expose ports (3000: Main App, 3090: Metrics, 3091: Health)
EXPOSE 3000
EXPOSE 3090
EXPOSE 3091

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD nc -z localhost 3000 || exit 1

# Use npm run start for production
CMD ["npm", "run", "start"] 