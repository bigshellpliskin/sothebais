# Development stage
FROM node:20-alpine AS development
WORKDIR /app

# Install dependencies including health check utilities
RUN apk add --no-cache curl

# Install dependencies first (better layer caching)
COPY package.json ./
RUN npm install

# Add node_modules/.bin to PATH
ENV PATH /app/node_modules/.bin:$PATH

# Copy the rest of the application
COPY . .

# Expose ports (3000: Main App, 3090: Metrics, 3091: Health)
EXPOSE 3000
EXPOSE 3090
EXPOSE 3091

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3091/health || exit 1

# Use npm run dev as the default command
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install health check utilities
RUN apk add --no-cache curl

# Install production dependencies
COPY package.json ./
RUN npm install --production

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose ports (3000: Main App, 3090: Metrics, 3091: Health)
EXPOSE 3000
EXPOSE 3090
EXPOSE 3091

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3091/health || exit 1

# Start production server
CMD ["npm", "start"] 