# Inter-Service Communication Framework

This directory contains utilities for implementing the inter-service communication framework for SothebAIs.

## Components

### Event Client (`events.ts`)

A Redis-based pub/sub client for asynchronous event communication between services.

Key features:
- Publish events to specific channels with type safety
- Subscribe to events with handler functions
- Event storage in Redis for history and replay
- Dead letter queue for failed events

```typescript
// Create an event client
const eventClient = new EventClient({
  redisUrl: 'redis://localhost:6379',
  serviceName: 'AUCTION_ENGINE'
});

// Connect to Redis
await eventClient.connect();

// Subscribe to events
await eventClient.subscribe('auction:start', async (event) => {
  console.log('Auction started:', event.data.auctionId);
  // Handle event
});

// Publish an event
const eventId = await eventClient.publish('BID_PLACED', {
  bidId: 'bid123',
  lotId: 'lot456',
  sessionId: 'session789',
  userId: 'user123',
  amount: '1000.00',
  currency: 'USD'
});
```

### Event Validation (`validation.ts`)

Utilities for validating event data structures.

Key features:
- Validate event structure and required fields
- Express middleware for validation
- Dead letter queue for failed events
- Event creation helpers

```typescript
// Validate an event
const validationResult = validateEvent(event);
if (validationResult !== true) {
  console.error('Invalid event:', validationResult);
}

// Create a valid event
const event = createEvent(
  'BID_PLACED',
  EVENT_SOURCES.AUCTION_ENGINE,
  {
    bidId: 'bid123',
    lotId: 'lot456',
    sessionId: 'session789',
    userId: 'user123',
    amount: '1000.00',
    currency: 'USD'
  }
);

// Use in Express middleware
app.post('/events', eventValidationMiddleware(), (req, res) => {
  // Event is valid if we get here
  const event = req.body;
  // Process event
  res.sendStatus(200);
});
```

### WebSocket Client (`websocket-client.ts`)

A robust WebSocket client with automatic reconnection and event handling.

Key features:
- Automatic reconnection with configurable attempts
- Event-based API
- Message parsing for JSON data
- Ping/pong protocol for connection health

```typescript
// Create a WebSocket client
const wsClient = new WebSocketClient({
  url: 'ws://example.com/ws',
  autoReconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  onOpen: (event, client) => {
    console.log('Connected!');
  },
  onMessage: (data, client) => {
    console.log('Received data:', data);
  },
  onClose: (event, client) => {
    console.log('Disconnected');
  },
  onError: (event, client) => {
    console.error('Error occurred');
  }
});

// Connect to server
wsClient.connect();

// Send data
wsClient.send({ type: 'message', content: 'Hello!' });

// Close connection
wsClient.close();
```

### HTTP Client (`http-client.ts`)

A fetch-based HTTP client with retry capabilities and error handling.

Key features:
- Automatic retries for network errors
- Timeout handling
- Response parsing based on content type
- Configurable default options

```typescript
// Create an HTTP client
const httpClient = new HttpClient('http://api.example.com');

// Set authorization
httpClient.setAuthToken('your-token');

// GET request
const response = await httpClient.get('/users');

// POST request with data
const result = await httpClient.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// PUT request with custom options
const updateResult = await httpClient.put('/users/123', {
  name: 'John Smith'
}, {
  timeout: 10000,
  retries: 2
});
```

## Usage Guidelines

1. **Consistent Event Types**: Always use the predefined event types from `EVENT_TYPES` enum.
2. **Error Handling**: Always handle errors in event subscribers to prevent cascading failures.
3. **Event Validation**: Validate events before processing to ensure data integrity.
4. **WebSocket Reconnection**: Configure appropriate reconnection intervals for your use case.
5. **HTTP Timeouts**: Set appropriate timeouts for different types of requests.

## Example Implementation

See the file `/packages/src/__examples__/communication-example.ts` for a complete example of implementing the communication framework in a service. 