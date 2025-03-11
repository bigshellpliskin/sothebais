FROM node:20-alpine
WORKDIR /app

# Install dependencies including health check utilities
RUN apk add --no-cache curl netcat-openbsd

# First create the basic directory structure
RUN mkdir -p /app/apps/admin /app/apps/shared

# Copy package files
COPY package*.json ./
COPY apps/admin/package*.json ./apps/admin/
COPY apps/shared/package*.json ./apps/shared/

# Copy shared directory (needed for TypeScript compilation)
COPY apps/shared/ ./apps/shared/

# Install dependencies
WORKDIR /app/apps/admin
# Always generate package-lock.json, then use npm ci for deterministic installs
RUN npm install --package-lock-only && npm ci

# Copy the rest of the admin application
COPY apps/admin/ ./

# Add node_modules/.bin to PATH and set other environment variables
ENV PATH="/app/apps/admin/node_modules/.bin:$PATH" \
    NEXT_TELEMETRY_DISABLED=1

# Generate TypeScript types and build the application
RUN npm run build

# Expose ports (3000: Main App, 3090: Metrics, 3091: Health)
EXPOSE 3000
EXPOSE 3090
EXPOSE 3091

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD nc -z localhost 3000 || exit 1

# Use npm run dev as the default command
CMD ["npm", "run", "dev"] 