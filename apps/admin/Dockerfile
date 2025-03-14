FROM node:22-alpine
WORKDIR /app

# Install dependencies including health check utilities
RUN apk add --no-cache curl netcat-openbsd

# Create shared directory for types
RUN mkdir -p /app/shared/types

# Copy package files
COPY apps/admin/package*.json ./

# Copy shared types
COPY apps/shared/types ../shared/types

# Install dependencies
RUN npm install

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

# Use npm run dev as the default command
CMD ["npm", "run", "dev"] 