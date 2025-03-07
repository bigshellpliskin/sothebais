FROM node:20-alpine
WORKDIR /app

# Install dependencies including health check utilities
RUN apk add --no-cache curl netcat-openbsd

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Add node_modules/.bin to PATH and set other environment variables
ENV PATH="/app/node_modules/.bin:$PATH" \
    NEXT_TELEMETRY_DISABLED=1

# Copy the rest of the application
COPY . .

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