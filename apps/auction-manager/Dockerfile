FROM node:18-alpine

WORKDIR /app

# Install dependencies including health check utilities
RUN apk add --no-cache curl

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose ports (4100: Main API, 4190: Metrics, 4191: Health)
EXPOSE 4100
EXPOSE 4190
EXPOSE 4191

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4191/health || exit 1

# Start development server
CMD ["npm", "run", "dev"] 