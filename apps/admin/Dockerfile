# Use Node.js 20 Alpine as base
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache docker-cli

# Set working directory
WORKDIR /app

# Copy package files first
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create required Next.js directories if they don't exist
RUN mkdir -p ./src/app

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 