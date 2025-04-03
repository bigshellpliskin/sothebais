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

# Copy admin app
COPY apps/admin ./apps/admin

# Set environment variables for build time - no need for ARGs since we've hardcoded the values
# in the apps/admin/.env.production file which Next.js will automatically load during build

# Install all dependencies and build packages
RUN npm install
RUN cd packages && npm run build

# Build admin with production configuration
RUN cd apps/admin && npm run build

# Copy static files to standalone directory - this is crucial for Next.js standalone mode
RUN mkdir -p apps/admin/.next/standalone/.next
RUN cp -R apps/admin/.next/static apps/admin/.next/standalone/.next/
RUN mkdir -p apps/admin/.next/standalone/apps/admin/.next
RUN cp -R apps/admin/.next/static apps/admin/.next/standalone/apps/admin/.next/

# Expose Next.js port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://127.0.0.1:3000/api/health || exit 1

# Default command using the standalone server (optimized for production with output: standalone)
WORKDIR /app/apps/admin
# Use wrapper script to ensure Next.js binds to all interfaces
CMD ["node", "server-wrapper.js"] 