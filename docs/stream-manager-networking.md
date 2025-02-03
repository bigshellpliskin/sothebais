# Stream Manager Networking Investigation

## Current State
- Health check endpoints are now accessible from inside container
- Container shows correct port bindings in netstat output
- Application ports (4200, 4201, 4290, 4291) are properly exposed
- Traefik routing is working as expected

## Environment Setup
- Ports are correctly configured in docker-compose.yml:
  ```yaml
  ports:
    - "4200:4200" # Main API
    - "4201:4201" # WebSocket
    - "4290:4290" # Metrics
    - "4291:4291" # Health
  ```
- Environment variables are correctly set inside container:
  ```
  METRICS_PORT=4290
  HEALTH_PORT=4291
  PORT=4200
  WS_PORT=4201
  ```

## New Requirements

### Demo Stream Card
- Endpoint for stream state: `/api/stream/state`
  - Returns current stream status
  - Includes error states
  - Provides performance metrics
- WebSocket events for real-time updates
  - Stream state changes
  - Error notifications
  - Performance metrics

### UI Enhancements
- New API endpoints needed:
  - `/api/stream/control` - Stream control operations
  - `/api/layers` - Layer management
  - `/api/resources` - Resource monitoring
  - `/api/analytics` - Stream analytics
- WebSocket channels:
  - `stream-state` - Stream status updates
  - `layer-updates` - Layer changes
  - `metrics` - Performance metrics
  - `chat` - Chat messages and events

## Network Architecture

### API Layer
- REST endpoints for control and configuration
- WebSocket for real-time updates
- GraphQL consideration for complex queries
- Rate limiting implementation
- Authentication and authorization

### WebSocket Channels
- Dedicated channels by functionality
- Binary protocol for performance
- Heartbeat mechanism
- Automatic reconnection
- State synchronization

### Metrics Collection
- Prometheus integration
- Custom metrics endpoints
- Real-time performance data
- Resource usage tracking
- Error rate monitoring

### Health Checks
- Enhanced health check system
- Component-level health status
- Dependency checks
- Performance indicators
- Error state reporting

## Security Considerations

### API Security
- JWT authentication
- Role-based access control
- Rate limiting
- Input validation
- CORS configuration

### WebSocket Security
- Connection authentication
- Message validation
- Rate limiting per channel
- Payload size limits
- Error handling

### Metrics Security
- Access control
- Data anonymization
- Rate limiting
- Filtered sensitive data
- Secure transport

## Performance Optimization

### Network Efficiency
- WebSocket message batching
- Binary protocols where applicable
- Compression for large payloads
- Connection pooling
- Keep-alive optimization

### Caching Strategy
- Redis caching layer
- In-memory caching
- Cache invalidation
- Distributed caching
- Cache warming

### Load Balancing
- Layer 7 load balancing
- WebSocket sticky sessions
- Health-based routing
- Circuit breaking
- Rate limiting

## Monitoring and Alerting

### Metrics Collection
- Request rates
- Error rates
- Response times
- Resource usage
- WebSocket connections

### Performance Monitoring
- Real-time metrics
- Historical data
- Trend analysis
- Anomaly detection
- Alert thresholds

### Error Tracking
- Error aggregation
- Root cause analysis
- Error patterns
- Recovery tracking
- Alert correlation

## Implementation Plan

### Phase 1: Core Infrastructure
- [x] Basic HTTP endpoints
- [x] WebSocket setup
- [x] Health checks
- [x] Metrics endpoints

### Phase 2: Enhanced Features
- [ ] Stream state management
- [ ] Layer control API
- [ ] Resource monitoring
- [ ] Analytics collection

### Phase 3: UI Integration
- [ ] Real-time updates
- [ ] Control interface
- [ ] Monitoring dashboard
- [ ] Analytics visualization

### Phase 4: Optimization
- [ ] Performance tuning
- [ ] Security hardening
- [ ] Monitoring enhancement
- [ ] Error handling improvement

## Next Steps

1. Implement stream state endpoint
2. Set up WebSocket channels for UI
3. Add metrics for new features
4. Enhance error handling
5. Implement security measures
6. Deploy monitoring system

## Related Services
- Traefik is handling routing (configured via labels)
- Redis dependency
- Event handler dependency

## Questions to Answer
1. Why aren't ports showing up in network tools?
2. Is the application actually binding to ports but not visible to tools?
3. Could there be a conflict with Traefik routing?
4. Is there a permission issue with the node user?

## Traefik Analysis
- Current Traefik configuration:
  - Main API (4200): Routed through three paths
    1. Development: PathPrefix(`/`)
    2. Production: Host(`${DOMAIN}`) && PathPrefix(`/stream`)
    3. Both use loadbalancer.server.port=4200
  - WebSocket (4201): Routed through PathPrefix(`/ws`)
  - Health (4291) and Metrics (4290): No Traefik routing rules

- Findings:
  1. No direct conflict in Traefik routing rules
  2. Health and metrics ports are not managed by Traefik
  3. Traefik only handles HTTP routing, not port binding
  4. Direct port access should still work regardless of Traefik

- Implications:
  1. Traefik is not likely the cause of port binding issues
  2. Health checks failing is a separate issue from Traefik routing
  3. The fact that netstat/lsof can't see the ports suggests the issue is at the application/container level, not the routing level 