# Use slim version consistently for both stages
FROM node:22-slim AS builder

# Install pnpm and build dependencies
RUN npm install -g pnpm@9.15.1 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    python3 \
    make \
    g++ \
    cmake \
    # Dependencies for canvas
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Switch to node user early
USER node
WORKDIR /app

# Copy files with correct ownership
COPY --chown=node:node package.json pnpm-lock.yaml ./

# Install ALL dependencies
RUN pnpm install --frozen-lockfile

# Copy source files with correct ownership
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node ./src ./src

# Create dist directory with correct permissions before building
RUN mkdir -p dist && chmod 755 dist
# Build the project
RUN pnpm build

# Final stage
FROM node:22-slim

# Install pnpm and runtime dependencies
RUN npm install -g pnpm@9.15.1 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    git \
    make \
    g++ \
    cmake \
    # Dependencies for canvas
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Switch to node user early
USER node
WORKDIR /app

# Create directory structure with correct ownership and permissions
RUN mkdir -p /app/storage/db \
            /app/storage/data \
            /app/storage/characters \
            /app/dist && \
    chown -R node:node /app/storage && \
    chmod -R 755 /app/storage && \
    chmod 777 /app/storage/db  # Ensure SQLite has write permissions

# Copy files with correct ownership
COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/src ./src
COPY --chown=node:node --from=builder /app/tsconfig.json ./

EXPOSE 3000

CMD ["node", "dist/index.js", "--non-interactive"]