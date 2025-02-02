# Admin Frontend Connectivity Issues (404/503 Errors)

## Issue Summary
Multiple connectivity issues have been detected in the admin frontend, affecting various services and endpoints. The issues appear to be network-related, with services unable to communicate properly.

## Observed Errors

### 1. Prometheus Metrics Issues
- All services returning 404 errors when trying to fetch Prometheus metrics
- Affected services include:
  - auction-manager
  - event-handler
  - stream-manager
  - shape-l2
  - eliza
  - admin-frontend
  - traefik
  - prometheus
  - grafana
  - node-exporter
  - redis

Error pattern:
```
Prometheus error for [service]: Prometheus returned status 404
Prometheus connection error: Prometheus health check failed: 404
```

### 2. API Endpoint Issues
- POST http://localhost:3000/api/services/metrics - 400 (Bad Request)
- GET http://localhost:3000/api/metrics/prometheus - 404 (Not Found)
- GET http://localhost:3000/api/services/metrics - 503 (Service Unavailable)

### 3. Event Handler Connection Issues
- GET http://localhost:4300/logs - Connection Refused
- GET http://localhost:4300/system-logs - Connection Refused

## Network Configuration Analysis

### Current Setup
1. All services are on the `auction_net` Docker network
2. Port Mappings:
   - admin-frontend: 3000:3000, 3090-3091:3090-3091
   - event-handler: 4300:4300 (API), 4301:4301 (Event Stream), 4390:4390 (Metrics), 4391:4391 (Health)
   - prometheus: 9090:9090
   - traefik: 80:80, 443:443, 3100:3100

### Traefik Configuration
1. Traefik is configured with:
   - API insecure mode enabled
   - Docker provider enabled
   - Prometheus metrics enabled
   - Health checks enabled
   - Exposed on ports 80, 443, and 3100

### Identified Issues
1. **Prometheus Configuration**:
   - Health endpoint returning 404s suggests misconfiguration
   - Metrics endpoint not properly exposed through Traefik
   - Possible service discovery issues between Prometheus and other services

2. **Event Handler Connectivity**:
   - Connection refused errors indicate the service might not be running or accessible
   - Port 4300 is mapped but not responding
   - Possible container health check failures

3. **Admin Frontend Issues**:
   - Service metrics endpoint returning multiple error codes (400, 404, 503)
   - Possible misconfiguration in API routes
   - Potential service discovery issues

## Impact
- Service metrics collection is completely broken
- System and application logs are inaccessible
- Service health monitoring is non-functional
- Admin dashboard functionality is severely impaired

## Previous State
- Services were previously able to communicate properly
- Admin frontend could successfully connect to event-handler
- Metrics collection was functional

## Possible Investigation Points
1. Network configuration changes
2. Service discovery issues
3. Prometheus configuration
4. Docker networking
5. Port mapping and exposure
6. Service health checks
7. Load balancer configuration (if applicable)

## Next Steps
1. Review recent infrastructure changes
2. Verify service discovery configuration
3. Check Docker network connectivity between services
4. Validate Prometheus and metrics endpoint configuration
5. Review service health check implementations
6. Inspect Traefik routing configuration

## Recommended Actions
1. **Verify Network Connectivity**:
   ```bash
   docker compose ps  # Check service status
   docker compose logs prometheus  # Check Prometheus logs
   docker compose logs traefik    # Check Traefik logs
   ```

2. **Check Service Health**:
   ```bash
   curl -v http://localhost:9090/-/healthy  # Prometheus health
   curl -v http://localhost:4300/health     # Event Handler health
   curl -v http://localhost:3000/api/health # Admin Frontend health
   ```

3. **Verify Traefik Configuration**:
   - Review Traefik dashboard at http://localhost:3100
   - Verify routing rules and service discovery
   - Check metrics endpoint configuration

4. **Review Docker Network**:
   ```bash
   docker network inspect auction_net
   ```

## Related Components
- admin-frontend
- event-handler
- prometheus
- traefik
- All microservices reporting metrics

## Notes
This issue requires immediate attention as it affects the entire monitoring and logging infrastructure of the system. The 404/503 errors suggest either configuration issues or service availability problems. The network analysis reveals potential misconfigurations in service discovery and routing rules.

## Root Cause Analysis Update

After investigating the networking configuration and code, we've identified the following:

1. **Service Network Configuration**
   - All services are correctly configured on the `auction_net` Docker network
   - Internal Docker DNS resolution is working as expected
   - Prometheus is running and healthy on port 9090

2. **URL Construction Bug (FIXED)**
   - The admin frontend was erroneously adding an extra `/prometheus` prefix to all Prometheus API requests
   - Example: `http://prometheus:9090/prometheus/api/v1/query` instead of `http://prometheus:9090/api/v1/query`
   - This caused the 404 errors as the paths were incorrect

3. **Networking Approach Validation**
   - Confirmed that using internal Docker networking (`http://prometheus:9090`) is the correct approach
   - No explicit Traefik routing is configured for Prometheus
   - Direct container-to-container communication is more efficient and secure

4. **Configuration Review**
   - Docker Compose: Services properly networked on `auction_net`
   - Traefik: No explicit Prometheus routing rules needed
   - Admin Frontend: Using correct internal Docker network URL

## Resolution
- Fixed URL construction in the admin frontend's metrics API route
- Removed incorrect `/prometheus` prefix from API requests
- Kept internal Docker networking URL (`http://prometheus:9090`)
- No changes needed to Docker Compose or Traefik configuration

## Verification Steps
1. Confirm Prometheus is accessible via internal Docker network
2. Verify metrics endpoint returns correct data
3. Check for any remaining 404 errors in admin frontend logs

## Recommended Fixes

1. **Update Admin Frontend Configuration**:
   ```diff
   - PROMETHEUS_URL=http://prometheus:9090
   + PROMETHEUS_URL=https://admin.sothebais.com/prometheus
   ```

2. **Verify Traefik Routing**:
   - Ensure all metrics requests go through Traefik
   - Update any direct container-to-container calls to use proper routing
   - Check TLS certificate configuration for secure endpoints

3. **Update API Routes**:
   - Review admin frontend API routes for proper proxying
   - Ensure metrics endpoints use correct Prometheus URL
   - Add error handling for Prometheus connection issues

[rest of the document remains unchanged...] 