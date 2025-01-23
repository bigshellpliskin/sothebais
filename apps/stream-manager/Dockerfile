FROM node:18-alpine

WORKDIR /app

# Install dependencies including health check utilities
RUN apk add --no-cache curl

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose ports (4200: Main API, 4201: WebSocket, 4290: Metrics, 4291: Health)
EXPOSE 4200
EXPOSE 4201
EXPOSE 4290
EXPOSE 4291

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4291/health || exit 1

# Start development server
CMD ["npm", "run", "dev"] 