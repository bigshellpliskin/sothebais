# SothebAIs Admin Dashboard

The Admin Dashboard is a Next.js application that provides administration capabilities for the SothebAIs auction platform.

## Features

- Authentication via Clerk
- Real-time auction management
- Stream monitoring and control
- User management
- System settings and configuration

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **State Management**: Zustand
- **UI Components**: Custom components with Radix UI primitives
- **Styling**: Tailwind CSS
- **Authentication**: Clerk
- **Data Fetching**: React Query (TanStack Query)
- **Database Connectivity**: Redis

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm or yarn
- Access to required services (Redis, etc.)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Create a `.env.local` file with the necessary configuration (see `.env.example` if available).

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code linting
- `npm test` - Run Jest tests

## Project Structure

```
apps/admin/
├── public/             # Static assets
├── src/                # Source code
│   ├── app/            # Next.js App Router pages
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries and configurations
│   ├── middleware.ts   # Next.js middleware (auth, etc.)
│   ├── store/          # Zustand state management
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Helper functions
├── Dockerfile          # Docker configuration for containerization
├── next.config.js      # Next.js configuration
├── package.json        # NPM dependencies and scripts
└── tailwind.config.js  # Tailwind CSS configuration
```

## Docker Deployment

The application includes Docker configuration for containerized deployment:

```bash
# Build the Docker image
docker build -t sothebais-admin .

# Run the container
docker run -p 3000:3000 sothebais-admin
```

Alternatively, use Docker Compose from the root directory of the monorepo:

```bash
docker compose up admin-frontend
```

## Integration with SothebAIs Platform

The Admin Dashboard communicates with other microservices in the SothebAIs ecosystem:

- **Stream Manager**: For managing live auction streams
- **Event Handler**: For processing system events
- **Auction Engine**: For auction business logic
- **Shared Library**: For common code and types

## Development Guidelines

1. Follow the project's code style and patterns
2. Write unit tests for new functionality
3. Update documentation when making significant changes
4. Use conventional commit messages

## Troubleshooting

- If you encounter connection issues, ensure the required services are running
- For authentication problems, verify your Clerk configuration
- Check the browser console and server logs for detailed error messages

## License

This project is proprietary to SothebAIs and is not licensed for public use. 