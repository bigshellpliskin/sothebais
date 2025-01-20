```mermaid
graph TD
    subgraph Host
        EP[ElizaOS Plugin] --> AM[Auction Manager]
        EP --> SM[Stream Manager]
        EP --> VM[VTuber Manager]
    end

    subgraph Infra
        AM --> DB[(Database)]
        AM --> Cache[(Redis)]
        SM --> MQ[(Message Queue)]
    end

    subgraph External
        SM --> TW[Twitter]
        AM --> SL[Shape L2]
        VM --> ST[Stream]
    end

    subgraph Monitor
        MS[Monitoring] --> EP
        MS --> Infra
        MS --> External
    end
    ```