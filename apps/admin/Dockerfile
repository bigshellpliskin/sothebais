# Development stage
FROM node:20-alpine AS development
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json ./
RUN npm install

# Add node_modules/.bin to PATH
ENV PATH /app/node_modules/.bin:$PATH

# Copy the rest of the application
COPY . .

# Expose port 3000
EXPOSE 3000

# Use npm run dev as the default command
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .
RUN npm run build
CMD ["npm", "start"] 