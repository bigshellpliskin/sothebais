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

# Copy auction-engine app
COPY apps/auction-engine ./apps/auction-engine

# Install all dependencies and build packages
RUN npm install
RUN cd packages && npm run build

# Create a specialized package.json for runtime link
RUN cd packages && echo '{"type":"module","name":"@sothebais/packages","exports":{"./utils/*":"./dist/utils/*.js","./types/*":"./dist/types/*.js","./schema/*":"./dist/schema/*.js"}}' > dist/package.json

# Clear and recreate symlinks to ensure they're correct
RUN rm -rf /app/node_modules/@sothebais/packages && \
    mkdir -p /app/node_modules/@sothebais && \
    ln -sf /app/packages/dist /app/node_modules/@sothebais/packages

# Build auction-engine
RUN cd apps/auction-engine && npm run build

# Expose ports
EXPOSE 4400 4490 4491

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4491/health || exit 1

# Default command
WORKDIR /app/apps/auction-engine
CMD ["npm", "run", "start"] 