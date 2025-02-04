# Stream Manager Utilities

This directory contains utility functions and shared tools used throughout the Stream Manager application.

## Components

### Logger (`logger.ts`)

A centralized logging system built on Pino that provides:
- Structured logging with context
- Log level management
- Pretty printing in development
- Metric logging
- Event-specific logging

```typescript
import { logger } from '../utils/logger';

// Basic logging
logger.info('Server started', { port: 4200 });
logger.error('Connection failed', { error: err.message });

// Event logging
logger.logLayerEvent('created', layerId, { type: 'overlay' });
logger.logStreamEvent('started', { resolution: '1920x1080' });
logger.logWebSocketEvent('connected', clientId, { ip: '192.168.1.1' });

// Metric logging
logger.logMetrics({
  fps: 30,
  memoryUsage: process.memoryUsage(),
  activeConnections: 5
});
```

#### Log Levels

1. **Fatal**: Unrecoverable errors
2. **Error**: Handled errors
3. **Warn**: Warning conditions
4. **Info**: General information
5. **Debug**: Detailed information
6. **Trace**: Very detailed debugging

#### Log Categories

1. **Layer Events**
   - Layer creation/deletion
   - Property updates
   - Visibility changes

2. **Stream Events**
   - Stream start/stop
   - Configuration changes
   - Error conditions

3. **WebSocket Events**
   - Client connections
   - Message handling
   - Error conditions

4. **Metrics**
   - Performance metrics
   - Resource usage
   - Operation timing

### Log Context

Each log entry can include structured context:

```typescript
interface LogContext {
  // Request context
  requestId?: string;
  method?: string;
  url?: string;
  
  // Error context
  error?: string;
  stack?: string;
  
  // Performance context
  duration?: number;
  memory?: number;
  
  // Custom context
  [key: string]: any;
}
```

### Log Output

Development output (pretty-printed):
```
[12:34:56] INFO: Server started
    port: 4200
    env: development
```

Production output (JSON):
```json
{
  "level": "info",
  "time": "2024-02-04T12:34:56.789Z",
  "msg": "Server started",
  "port": 4200,
  "env": "production"
}
```

## Configuration

Logger configuration options:

```typescript
interface LoggerOptions {
  name?: string;
  level?: LogLevel;
  prettyPrint?: boolean;
}

// Initialize logger
logger.initialize({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  prettyPrint: process.env.NODE_ENV !== 'production'
});
```

## Best Practices

1. **Structured Logging**
   - Always include relevant context
   - Use consistent field names
   - Include request IDs for tracing

2. **Error Logging**
   - Include error stack traces
   - Add relevant context
   - Use appropriate log levels

3. **Performance Logging**
   - Include operation duration
   - Log resource usage
   - Track important metrics

4. **Security**
   - Avoid logging sensitive data
   - Sanitize error messages
   - Respect privacy settings
``` 