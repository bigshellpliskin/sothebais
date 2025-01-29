# Server and Client Components Overview

## Server Components

Server components are the default in Next.js 13+ app directory. They offer better performance and smaller bundle sizes by rendering on the server.

### App Directory (Server Components)
- ✅ `app/page.tsx` - Main application page
  - 🟢 `Home()`: Uses redirect() - Safe, no serialization issues
- ✅ `app/layout.tsx` - Root layout
  - 🟢 `RootLayout()`: Server component with proper client boundaries
    - Moved QueryClient to separate client component
    - Maintains proper HTML structure
    - No serialization or hydration issues
  - 🟢 `inter`: Font initialization - Safe, static configuration
  - 🟢 `metadata`: Static object - Safe, no serialization needed
  - 🟢 `cn()`: Utility function - Safe, returns string only
- ✅ `app/dashboard/page.tsx` - Dashboard page
  - 🟢 `DashboardPage()`: Renders client component - Safe, direct pass-through
- ✅ `app/dashboard/layout.tsx` - Dashboard layout
  - 🟢 `DashboardLayout()`: Renders Clerk components and client components - Safe, no direct data passing
- ✅ `app/sign-in/[[...sign-in]]/page.tsx` - Sign in page
  - 🟢 `SignInPage()`: Renders Clerk SignIn component - Safe, only static config
- ✅ `app/api/services/metrics/route.ts` - Metrics API endpoint
  - 🟢 `queryPrometheus()`: Safe - Improved with:
    - Timeout handling with AbortController
    - Proper error handling and type safety
    - Sanitized response parsing
    - Consistent error messaging
  - 🟢 `calculateTrend()`: Safe - Returns string literal type only
  - 🟢 `POST()`: Safe - Improved with:
    - Input validation and sanitization
    - Query pattern matching for security
    - Proper error handling and type safety
    - Consistent response format
    - Proper HTTP headers
  - 🟢 `GET()`: Safe - Improved with:
    - Parallel metric fetching
    - Health check with timeout
    - Type-safe response structure
    - Proper error handling
    - Cache control headers
    - Timestamp tracking
  - 🟢 Type definitions: Safe - Comprehensive type safety
    - `MetricValue`: Strict type definitions for metric values
    - `MetricsResponse`: Complete response structure
    - `PrometheusQueryResponse`: Full Prometheus response typing
  - 🟢 `PROMETHEUS_URL`: Safe - Environment variable string
- ✅ `app/api/services/status/route.ts` - Status API endpoint
  - 🟢 `queryPrometheusStatus()`: Safe - Improved with:
    - Strong TypeScript interfaces for Prometheus responses
    - Custom error handling with PrometheusError class
    - Proper timeout handling with AbortController
    - Comprehensive response validation
    - Consistent error logging patterns
    - JSDoc documentation
  - 🟢 `getServiceStatus()`: Safe - Simplified to:
    - Use shared Prometheus query logic
    - Focus on service-specific query construction
    - Type-safe parameter handling
  - 🟢 `getRedisStatus()`: Safe - Simplified to:
    - Use shared Prometheus query logic
    - Consistent with service status checks
  - 🟢 `GET()`: Safe - Improved with:
    - Parallel status checks for better performance
    - Consistent error handling
    - Type-safe response structure
    - Proper HTTP headers
  - 🟢 Type definitions: Safe - Comprehensive type safety
    - `ServiceConfig`: Service configuration interface
    - `PrometheusResponse`: Complete Prometheus API typing
    - `PrometheusError`: Custom error class for better error handling
  - 🟢 `PROMETHEUS_URL`: Safe - Environment variable string
  - 🟢 `SERVICES`: Safe - Static configuration array

### Server Middleware
- ✅ `middleware.ts` - Clerk authentication middleware (runs at the edge)
  - ⚠️ `afterAuth()`: Receives Clerk auth object - May contain non-serializable data

### Key
- ✅ Server Component
- ⚠️ Function with potential serialization issues
- 🔄 Client Component
- 🟢 Safe Function (no serialization issues)

## Client Components

Client components are marked with "use client" directive and are used for interactive features that require client-side JavaScript.

### Dashboard Components
- 🔄 `components/dashboard/dashboard-content.tsx` - Main dashboard content
- 🔄 `components/dashboard/event-log.tsx` - Event logging display
- 🔄 `components/dashboard/header-status.tsx` - Header status information
- 🔄 `components/dashboard/system-metrics.tsx` - System metrics display
- 🔄 `components/dashboard/system-overview.tsx` - System overview display
- 🔄 `components/dashboard/system-settings.tsx` - System settings interface

### UI Components
- 🔄 `components/ui/icon-wrapper.tsx` - Icon wrapper utility
- 🔄 `components/ui/status-card.tsx` - Status card display
- 🔄 `components/ui/widget.tsx` - Widget container component
- 🔄 `components/ui/status-indicator.tsx` - Status indicator component

### Client-Side State and Hooks
- 🔄 `store/services.ts` - Zustand store for service state
- 🔄 `hooks/useServiceStatus.ts` - Custom hook for service status

## Utility and Type Files

These files are not components but support the application's functionality. They can be used in both server and client components:

- `lib/utils.ts` - Shared utility functions
- `types/service.ts` - TypeScript type definitions

## Best Practices

1. **Server Components**
   - Use for static content
   - Better for SEO
   - Reduced client-side JavaScript
   - Default in app directory

2. **Client Components**
   - Use when you need:
     - Interactivity and event listeners
     - Browser APIs
     - State management
     - Effects and lifecycle methods
     - Client-side routing

3. **Component Selection Guidelines**
   - Start with Server Components
   - Convert to Client Components only when needed
   - Keep Client Components lean
   - Use composition to minimize client-side JavaScript

4. **Data Flow**
   - Server → Client: Only serializable data
   - Avoid passing complex objects
   - Use JSON.parse(JSON.stringify()) when needed
   - Be cautious with Date objects and class instances

## Common Issues

1. **Server to Client Data Transfer**
   - Error: "Only plain objects can be passed to Client Components from Server Components"
   - Solution: Ensure data is serializable
   - Convert complex objects to plain objects
   - Use JSON methods for sanitization

2. **Component Boundaries**
   - Keep clear separation between server and client components
   - Use composition to isolate client-side logic
   - Avoid mixing server and client code in the same component