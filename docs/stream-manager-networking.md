# Stream Manager Networking Investigation

## Current Issues
- Health check endpoints are not accessible from both inside and outside the container
- Container shows only Docker DNS ports (127.0.0.11) in netstat output
- Application ports (4200, 4201, 4290, 4291) are not showing up in network tools

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

## Investigation Steps Taken

1. **Port Binding Check**
   - Used `netstat -tulpn` - only showed Docker DNS (127.0.0.11)
   - Used `lsof -i -P` - showed no open ports
   - Used `ss -tulpn` - tool not available in container

2. **Process Verification**
   - Confirmed Node.js processes are running:
     ```
     1 node      0:00 npm run dev
     17 node     0:01 node /app/node_modules/.bin/ts-node-dev --respawn --transpile-only src/index.ts
     ```

3. **Container Health**
   - Container marked as "unhealthy" in Docker status
   - Health check failing despite application logs showing successful startup

4. **Application Logs**
   - Show successful startup
   - No error messages about port binding failures
   - Successfully connects to Redis and loads resources

## Attempted Solutions

1. **Changed Health Check Method**
   - Modified Dockerfile to use wget instead of curl
   - Changed localhost to 0.0.0.0 in health check

2. **Added Explicit Host Binding**
   - Added HOST=0.0.0.0 to environment variables
   - Should force application to bind to all interfaces

## Next Steps to Investigate

1. **Application Code Review**
   - Verify Express server configuration in index.ts
   - Check if servers are actually starting on specified ports
   - Review error handling in server startup

2. **Network Configuration**
   - Review Docker network configuration
   - Check if Traefik routing might be interfering
   - Verify network mode in Docker Compose

3. **Process Permissions**
   - Verify node user has necessary permissions
   - Check capability requirements for port binding

4. **Monitoring**
   - Add more detailed logging around server startup
   - Monitor process status over time to check for restarts

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