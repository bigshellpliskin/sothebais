# Admin Frontend Service

This service provides the administrative interface for managing and monitoring the SothebAI's NFT auction system.

## Architecture Plan

### Tech Stack
- Next.js 14+ (App Router)
- Tailwind CSS + shadcn/ui
- Clerk for authentication
- React Query for data fetching
- Zustand for state management
- Docker Engine API for container monitoring
- Server-Sent Events for log streaming

### Core Features
1. Authentication & Access Control
   - Secure login page at `/sign-in`
   - Built-in session management
   - Protected routes via middleware
   - Role-based access control
   - OAuth providers (optional)
   - Organization management (optional)

2. Docker Service Monitoring
   - Real-time container status monitoring
   - Container health checks
   - Container start/stop/restart controls
   - Container logs streaming

3. Log Management
   - Real-time log streaming for each service
   - Log search and filtering
   - Log level filtering (ERROR, WARN, INFO, DEBUG)
   - Log retention management
   - Log download functionality
   - Multi-container log correlation

4. Dashboard
   - Service health overview
   - Container status cards
   - System resource metrics
   - Active auctions summary
   - Recent events timeline

### Directory Structure
```
apps/admin/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── sign-in/           # Authentication pages
│   │   ├── dashboard/         # Protected dashboard
│   │   ├── services/          # Service management
│   │   └── logs/             # Log viewer
│   ├── components/
│   │   ├── auth/             # Authentication components
│   │   ├── ui/               # Base UI components
│   │   ├── features/         # Feature-specific components
│   │   ├── monitoring/       # Docker monitoring components
│   │   └── logs/            # Log viewing components
│   ├── lib/
│   │   ├── auth/            # Authentication utilities
│   │   ├── docker/          # Docker API integration
│   │   └── websocket/       # WebSocket handlers
│   ├── hooks/
│   │   ├── useAuth/         # Authentication hooks
│   │   ├── useDockerStats/  # Docker statistics hooks
│   │   └── useLogs/         # Log streaming hooks
│   ├── store/               # State management
│   ├── types/               # TypeScript types
│   └── api/                 # API route handlers
├── public/                  # Static assets
├── tests/                   # Test files
└── config/                  # Configuration files
```

### Core System Architecture

#### 1. Authentication Layer (Clerk)
```typescript
// src/middleware.ts
export default authMiddleware({
  publicRoutes: ["/"],
  ignoredRoutes: ["/api/health"],
  afterAuth(auth, req) {
    // Custom authorization logic
  }
});
```

#### 2. Docker Integration Layer
```typescript
// src/lib/docker/client.ts
export class DockerClient {
  private socket: string;
  
  constructor() {
    this.socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
  }

  async listContainers() {
    // Implementation
  }

  async getContainerLogs(id: string) {
    // Implementation
  }

  async containerStats(id: string) {
    // Implementation
  }
}
```

#### 3. Real-time Logging System
```typescript
// src/lib/logs/stream.ts
export class LogStreamer {
  private clients: Set<SSEConnection>;

  async streamContainerLogs(containerId: string, client: SSEConnection) {
    // Implementation
  }

  async broadcastLog(log: LogEntry) {
    // Implementation
  }
}
```

### Feature Implementation Details

#### 1. Authentication & Access Control
```typescript
// src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/ui/logo";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex items-center justify-center">
        <SignIn 
          appearance={{
            elements: {
              rootBox: "w-full max-w-md",
              card: "shadow-lg"
            }
          }}
        />
      </div>
      <div className="hidden lg:flex flex-1 bg-primary">
        <Logo className="m-auto h-12 w-12" />
      </div>
    </div>
  );
}
```

#### 2. Dashboard Layout
```typescript
// src/components/layout/dashboard.tsx
export function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-6">
        <TopNav />
        {children}
      </main>
    </div>
  );
}
```

#### 3. Container Monitoring
```typescript
// src/components/features/container-monitor.tsx
export function ContainerMonitor() {
  const { data: containers } = useContainers();
  const stats = useContainerStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {containers.map(container => (
        <ContainerCard
          key={container.id}
          container={container}
          stats={stats[container.id]}
        />
      ))}
    </div>
  );
}
```

#### 4. Log Viewer
```typescript
// src/components/features/log-viewer.tsx
export function LogViewer({ containerId }: { containerId: string }) {
  const logs = useContainerLogs(containerId);
  const [filter, setFilter] = useState<LogLevel>();

  return (
    <div className="h-[600px] flex flex-col">
      <LogToolbar onFilterChange={setFilter} />
      <LogList logs={logs} filter={filter} />
    </div>
  );
}
```

### Development Setup

1. Install dependencies:
```bash
cd apps/admin
npm install
npm install @clerk/nextjs
```

2. Set up environment variables:
```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
DOCKER_SOCKET=/var/run/docker.sock
LOG_RETENTION_DAYS=7
```

3. Configure Docker socket access:
```bash
# For development
sudo chmod 666 /var/run/docker.sock

# For production (Dockerfile)
FROM node:20-alpine
RUN apk add --no-cache docker-cli
USER node
```

### Security Considerations
- Clerk handles:
  - Session management
  - CSRF protection
  - Rate limiting
  - Password hashing
  - MFA
  - OAuth
- Additional security:
  - Secure Docker socket access
  - Log access control
  - Socket connection security
  - Input validation
  - Regular security audits

### Type Definitions

```typescript
// src/types/docker.ts
export interface Container {
  id: string;
  name: string;
  status: ContainerStatus;
  image: string;
  ports: Port[];
  created: Date;
}

export interface ContainerStats {
  cpu: number;
  memory: {
    usage: number;
    limit: number;
  };
  network: {
    rx_bytes: number;
    tx_bytes: number;
  };
}

// src/types/logs.ts
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  container: string;
  service: string;
}
```

### Implementation Steps

1. Project Setup
   - Initialize Next.js with TypeScript
   - Configure Tailwind and shadcn/ui
   - Set up Clerk authentication
   - Configure Docker socket access

2. Core Features
   - Implement Docker client
   - Set up log streaming
   - Create container monitoring
   - Build dashboard UI

3. Security & Polish
   - Implement access controls
   - Add error handling
   - Set up monitoring
   - Add loading states

4. Testing & Deployment
   - Write core tests
   - Set up CI/CD
   - Configure production environment
   - Deploy initial version

This implementation plan focuses on getting a secure, functional admin interface up and running as quickly as possible while maintaining good practices and security standards. 