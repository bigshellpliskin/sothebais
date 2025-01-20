FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose any necessary ports
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 