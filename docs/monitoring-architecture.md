```mermaid
graph TD
    subgraph Frontend Infrastructure
        T[Traefik] --> |Expose metrics :3100| P
        AF[Admin Frontend :3090] --> |Expose metrics| P
        EH[Event Handler :4390] --> |Expose metrics| P
        R[Redis :6379] --> |Expose metrics| RE[Redis Exporter]
        RE --> P
    end

    subgraph Monitoring Stack
        P[Prometheus :9090] --> |Collect metrics| G[Grafana :3000]
        G --> |Display| D1[System Dashboards]
        G --> |Display| D2[Application Metrics]
        G --> |Display| D3[Business Metrics]
    end

    subgraph Access Layer
        U[Users] --> |HTTPS| T
        A[Admins] --> |"monitoring.domain.com"| G
    end
``` 

# Monitoring Architecture

This diagram illustrates how metrics flow from our services through Prometheus to Grafana:

1. Each service exposes metrics on its designated port
2. Prometheus scrapes these metrics at regular intervals
3. Grafana queries Prometheus and displays the data in dashboards
4. Access is secured through Traefik's reverse proxy

## Exposed Metrics Ports

- Traefik: 3100
- Admin Frontend: 3090
- Event Handler: 4390
- Redis Exporter: 9121
- Prometheus: 9090
- Grafana: 3000

## Security Notes

- All metrics endpoints are internal only
- Grafana access is protected by authentication
- HTTPS is enforced for all external access
