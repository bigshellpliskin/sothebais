FROM node:18-alpine

WORKDIR /app

# Install dependencies including health check utilities
RUN apk add --no-cache curl

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose ports (4000: Main API, 4090: Metrics, 4091: Health)
EXPOSE 4000
EXPOSE 4090
EXPOSE 4091

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4091/health || exit 1

# Start development server
CMD ["npm", "run", "dev"] 