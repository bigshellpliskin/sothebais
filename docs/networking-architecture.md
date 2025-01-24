# Networking Architecture

This document details how the networking flows from local ports to public domains for the Sothebais application.

```mermaid
graph TD
    Internet[Internet] --> DNS[DNS: *.sothebais.com]
    DNS --> Server[Server Ports 80/443]
    Server --> Traefik[Traefik Reverse Proxy]
    
    subgraph Docker Network frontend_net
        Traefik --> |admin.sothebais.com| AdminFrontend[Admin Frontend<br/>Port 3000]
        Traefik --> |events.sothebais.com| EventHandler[Event Handler<br/>Ports 4300/4301]
        Traefik --> |monitoring.sothebais.com| MonitoringStack[Monitoring Stack]
        
        subgraph Monitoring Stack
            MonitoringStack --> Prometheus[Prometheus<br/>Port 9090]
            MonitoringStack --> Grafana[Grafana<br/>Port 3000]
            MonitoringStack --> RedisExporter[Redis Exporter<br/>Port 9121]
        end
        
        AdminFrontend --> Redis[Redis<br/>Port 6379]
        EventHandler --> Redis
        RedisExporter --> Redis
        Prometheus --> RedisExporter
    end

    classDef external fill:#f96,stroke:#333,stroke-width:2px
    classDef proxy fill:#95DAC1,stroke:#333,stroke-width:2px
    classDef service fill:#B6E2D3,stroke:#333,stroke-width:2px
    classDef monitoring fill:#D7ECD9,stroke:#333,stroke-width:2px
    
    class Internet,DNS external
    class Traefik proxy
    class AdminFrontend,EventHandler,Redis service
    class Prometheus,Grafana,RedisExporter,MonitoringStack monitoring
```

## Architecture Details

1. **External Access**
   - All traffic enters through DNS resolution of *.sothebais.com
   - Initial entry points are ports 80 (HTTP) and 443 (HTTPS)

2. **Traefik (Reverse Proxy)**
   - Handles SSL/TLS termination using Let's Encrypt
   - Routes traffic based on Host headers
   - Manages automatic certificate renewal
   - Provides load balancing

3. **Service Routing**
   - `admin.sothebais.com` → Admin Frontend (port 3000)
   - `events.sothebais.com` → Event Handler (ports 4300/4301)
   - `monitoring.sothebais.com` → Monitoring Stack

4. **Docker Network**
   - All services run on `frontend_net` Docker network
   - Internal service discovery via Docker DNS
   - Isolated network environment
   - Services communicate using service names

5. **Monitoring Infrastructure**
   - Prometheus collects metrics from services
   - Redis Exporter provides Redis metrics
   - Grafana visualizes collected metrics
   - All monitoring UIs accessible via monitoring subdomain

## Security Considerations

- SSL/TLS encryption for all public endpoints
- Internal services not directly exposed to internet
- Docker network isolation
- Traefik handles security headers and HTTPS redirects 