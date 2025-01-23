FROM node:18-alpine

WORKDIR /app

# Install dependencies including health check utilities
RUN apk add --no-cache curl

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose ports (4300: Main API, 4301: Event Stream, 4390: Metrics, 4391: Health)
EXPOSE 4300
EXPOSE 4301
EXPOSE 4390
EXPOSE 4391

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4391/health || exit 1

# Start development server
CMD ["npm", "run", "dev"] 