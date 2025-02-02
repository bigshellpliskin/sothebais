# Networking Architecture V2

This document provides a comprehensive overview of the networking architecture in the Sothebais NFT Auction System.

```mermaid
graph TD
    %% External Access Layer
    Internet[Internet] --> |HTTPS/443, HTTP/80| Traefik[Traefik Reverse Proxy]
    
    %% Domain Routing Layer
    subgraph Domain Routing
        Traefik --> |admin.sothebais.com| AdminFrontend[Admin Frontend<br/>:3000, :3090-3091]
        Traefik --> |sothebais.com| RootRedirect[Root Domain Redirect]
        RootRedirect --> AdminFrontend
    end
    
    %% Core Services Layer
    subgraph Core Services [Docker Network: auction_net]
        AdminFrontend <--> |Internal| AuctionManager[Auction Manager<br/>:4100, :4190-4191]
        AdminFrontend <--> |Internal| EventHandler[Event Handler<br/>:4300-4301, :4390-4391]
        AdminFrontend <--> |Internal| StreamManager[Stream Manager<br/>:4200-4201, :4290-4291]
        
        %% Service Dependencies with Redis (Bidirectional)
        AuctionManager <--> |:6379| Redis[Redis]
        EventHandler <--> |:6379| Redis
        StreamManager <--> |:6379| Redis
        
        %% Monitoring Stack with Corrected Data Flow
        subgraph Monitoring
            %% Services send metrics to Prometheus
            AdminFrontend --> |Push Metrics| Prometheus[Prometheus<br/>:9090]
            AuctionManager --> |Push Metrics| Prometheus
            EventHandler --> |Push Metrics| Prometheus
            StreamManager --> |Push Metrics| Prometheus
            RedisExporter[Redis Exporter<br/>:9121] --> |Push Metrics| Prometheus
            NodeExporter[Node Exporter<br/>:9100] --> |Push Metrics| Prometheus
            RedisExporter <--> Redis
            
            %% Admin Frontend queries Prometheus
            AdminFrontend <--> |Query Metrics| Prometheus
            %% Grafana queries Prometheus
            Grafana[Grafana<br/>:3001] <--> |Query Data| Prometheus
        end
    end
    
    %% Port Legend
    subgraph Port Legend
        L1[Main Service Ports]
        L2[Metrics Ports: xx90]
        L3[Health Check Ports: xx91]
        L4[WebSocket/Stream Ports: xx01]
    end
    
    %% Styling
    classDef external fill:#f96,stroke:#333,stroke-width:2px
    classDef proxy fill:#95DAC1,stroke:#333,stroke-width:2px
    classDef service fill:#B6E2D3,stroke:#333,stroke-width:2px
    classDef monitoring fill:#D7ECD9,stroke:#333,stroke-width:2px
    classDef database fill:#FFE5D9,stroke:#333,stroke-width:2px
    classDef legend fill:#f5f5f5,stroke:#666,stroke-width:1px,stroke-dasharray: 5 5
    
    class Internet external
    class Traefik,RootRedirect proxy
    class AdminFrontend,AuctionManager,EventHandler,StreamManager service
    class Prometheus,Grafana,RedisExporter,NodeExporter monitoring
    class Redis database
    class L1,L2,L3,L4 legend
```

## HTTP Routing Architecture

```mermaid
sequenceDiagram
    participant Internet as Internet/Client
    participant FW as Firewall
    participant DNS as DNS (*.sothebais.com)
    participant TR as Traefik Proxy
    participant CL as Clerk Auth
    participant AF as Admin Frontend
    participant AS as Admin Service API
    participant DC as Docker Container

    Note over Internet,DC: Request Flow Example: admin.sothebais.com/dashboard
    
    Internet->>FW: Request (TCP 80/443)
    FW->>DNS: Allow & Forward
    DNS->>TR: Route to Traefik
    
    rect rgb(240, 240, 240)
        Note over TR: Traefik Processing
        TR->>TR: 1. TLS Termination
        TR->>TR: 2. HTTP to HTTPS Redirect
        TR->>TR: 3. Domain & Path Routing
    end

    alt Public Routes (/api/health, /metrics)
        TR->>AS: Direct to Service
    else Protected Admin Routes
        TR->>CL: Forward to Clerk Auth
        
        rect rgb(230, 245, 255)
            Note over CL: Auth Processing
            CL->>CL: 1. Validate Session
            CL->>CL: 2. Check Permissions
            CL->>CL: 3. Attach User Data
        end
        
        alt Unauthorized
            CL->>TR: Redirect to /sign-in
            TR->>Internet: Return Sign In Page
        else Authorized
            CL->>AF: Forward to Admin Frontend
            
            rect rgb(245, 240, 245)
                Note over AF: Next.js Processing
                AF->>AF: 1. Route Handling
                AF->>AF: 2. Middleware Check
                AF->>AF: 3. Component Auth
            end
            
            alt API Request
                AF->>AS: Forward to Service API
                AS->>DC: Internal Docker Network
                DC-->>AS: Response
                AS-->>AF: API Response
            else Page Request
                AF->>AF: Render Page
            end
            
            AF-->>TR: Return Response
        end
    end
    
    TR-->>Internet: Final Response

    Note over Internet,DC: Color Legend
    Note over Internet,DC: Grey: Network Layer
    Note over Internet,DC: Blue: Auth Layer
    Note over Internet,DC: Purple: Application Layer
```

## SSH Connection Architecture

```mermaid
sequenceDiagram
    participant LC as Local Computer
    participant IR as Internet Router
    participant VP as VPS Provider Network
    participant UF as UFW (VPS Firewall)
    participant SS as SSH Server (Port 22)
    participant DC as Docker Network
    participant TR as Traefik Proxy
    participant SV as Services

    Note over LC,SV: SSH Connection Flow to VPS Services

    rect rgb(240, 240, 240)
        Note over LC: Local Setup
        LC->>LC: 1. SSH Key Auth
        LC->>LC: 2. SSH Config
        LC->>LC: 3. VSCode Remote
    end

    LC->>IR: SSH Connection Request
    IR->>VP: Forward to VPS IP
    
    rect rgb(255, 240, 240)
        Note over VP,UF: VPS Security Layer
        VP->>UF: Check UFW Rules
        UF->>UF: 1. Allow Port 22
        UF->>UF: 2. Block Other Ports
        UF->>UF: 3. Rate Limiting
    end

    alt UFW Blocked
        UF-->>VP: Connection Rejected
        VP-->>IR: Connection Failed
        IR-->>LC: Connection Refused
    else UFW Allowed
        UF->>SS: Forward to SSH Server
        
        rect rgb(230, 245, 255)
            Note over SS: SSH Authentication
            SS->>SS: 1. Key Verification
            SS->>SS: 2. User Auth (pliskin)
            SS->>SS: 3. Session Setup
        end

        alt Auth Failed
            SS-->>UF: Auth Rejected
            UF-->>VP: Connection Failed
            VP-->>LC: Auth Failed
        else Auth Success
            SS->>DC: Access Docker Network
            
            rect rgb(245, 240, 245)
                Note over DC: Docker Access
                DC->>DC: 1. Network Bridge
                DC->>DC: 2. Container Access
                DC->>TR: 3. Traefik Routes
                TR->>SV: 4. Service Access
            end

            %% Return path for successful connection
            SV-->>TR: Service Response
            TR-->>DC: Route Response
            DC-->>SS: Forward Response
            SS-->>UF: Encrypted Response
            UF-->>VP: Pass Through
            VP-->>IR: Forward Response
            IR-->>LC: Final Response
        end
    end

    Note over LC,SV: Color Legend
    Note over LC,SV: Grey: Local/Network Layer
    Note over LC,SV: Red: Firewall/Security Layer
    Note over LC,SV: Blue: SSH Auth Layer
    Note over LC,SV: Purple: Docker/Service Layer
```

## Network Architecture Details

### 1. External Access Layer
- All traffic enters through Traefik reverse proxy
- SSL/TLS termination at Traefik (ports 80/443)
- Let's Encrypt certificate management
- Root domain (sothebais.com) redirects to admin subdomain

### 2. Service Port Convention
Each service follows a consistent port numbering scheme:
- Main service port: xx00 (e.g., 3000, 4100, 4200)
- WebSocket/Stream port: xx01 (e.g., 4201, 4301)
- Metrics port: xx90 (e.g., 3090, 4190, 4290)
- Health check port: xx91 (e.g., 3091, 4191, 4291)

### 3. Core Services
- **Admin Frontend** (3000)
  - Main web interface
  - Metrics exposed on :3090
  - Health checks on :3091
  
- **Auction Manager** (4100)
  - Core auction service
  - Metrics on :4190
  - Health on :4191
  
- **Event Handler** (4300)
  - Event processing and distribution
  - Event stream on :4301
  - Metrics on :4390
  - Health on :4391
  
- **Stream Manager** (4200)
  - Stream composition and management
  - WebSocket on :4201
  - Metrics on :4290
  - Health on :4291

### 4. Monitoring Infrastructure
- **Prometheus** (9090)
  - Central metrics collection
  - Scrapes metrics from all services
  - Accessible via Traefik at /prometheus path
  
- **Grafana** (3001)
  - Metrics visualization
  - Dashboards for all services
  - Accessible via Traefik at /grafana path
  
- **Redis Exporter** (9121)
  - Exports Redis metrics to Prometheus
  
- **Node Exporter** (9100)
  - Exports host system metrics

### 5. Docker Networking
- All services run on `auction_net` Docker network
- Internal service discovery via Docker DNS
- Services communicate using service names (e.g., `redis:6379`)
- Isolated network environment

### 6. Security Considerations
- SSL/TLS encryption for all external traffic
- Internal services not directly exposed to internet
- Docker network isolation
- Traefik handles security headers and HTTPS redirects
- Authentication required for admin interface
- Metrics and health check endpoints protected

### 7. Health Monitoring
Each service implements:
- Health check endpoint on port xx91
- Prometheus metrics on port xx90
- Docker health checks
- Automatic container restart on failure

### 8. Service Discovery
- Traefik auto-discovers services via Docker labels
- Internal service discovery via Docker DNS
- Prometheus service discovery via static configuration
- Grafana discovers data sources via provisioning

## Port Reference

| Service | Main Port | WS/Stream Port | Metrics Port | Health Port |
|---------|-----------|----------------|--------------|-------------|
| Traefik | 80/443 | - | 3100 | - |
| Admin Frontend | 3000 | - | 3090 | 3091 |
| Auction Manager | 4100 | - | 4190 | 4191 |
| Event Handler | 4300 | 4301 | 4390 | 4391 |
| Stream Manager | 4200 | 4201 | 4290 | 4291 |
| Prometheus | 9090 | - | - | - |
| Grafana | 3001 | - | - | - |
| Redis | 6379 | - | 9121* | - |
| Node Exporter | - | - | 9100 | - |

\* Redis metrics are exposed via Redis Exporter 