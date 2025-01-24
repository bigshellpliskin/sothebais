```mermaid
graph TD
    %% Core System Components
    subgraph CoreSystem[Core System Components]
        AM[Auction Manager<br>- NFT Lifecycle Control<br>- Bid Processing<br>- Business Logic<br>- System Orchestration]
        SM[Stream Manager<br>- Twitter Integration<br>- Bid Monitoring]
        EL[ElizaOS<br>- Character Assets<br>- Visual Output]
        SL[Shape L2 Integration<br>- Smart Contracts<br>- NFT Transfers]
    end

    %% Event System
    subgraph EventSystem[Event Collection & State]
        EH[Event Handler<br>- Event Aggregation<br>- State Collection<br>- External Integration]
    end

    %% State Management
    subgraph StateManagement[State & Storage]
        DB[(Redis<br>- Auction State<br>- User Data)]
    end

    %% Monitoring System
    subgraph MonitoringSystem[System Monitoring]
        PR[Prometheus<br>- Metrics Collection<br>- Time Series DB]
        GF[Grafana<br>- Dashboards<br>- Visualization]
    end

    %% External Services
    subgraph ExternalServices[External Services]
        TS[Twitter Stream<br>- User Interaction]
        SO[Stream Output<br>- Visual Feed]
        SC[Smart Contracts<br>- Blockchain]
    end

    %% Core Control Flow - Auction Manager Driven
    AM --> SM
    AM --> EL
    AM --> SL
    
    %% Event Handler as Aggregator
    EH --> AM
    TS --> EH
    SC --> EH
    
    %% Component to External Flow
    SM --> TS
    EL --> SO
    SL --> SC
    
    %% State Connections
    DB --> AM
    AM --> DB
    
    %% Monitoring Connections
    PR --> AM
    PR --> SM
    PR --> EL
    PR --> SL
    PR --> EH
    GF --> PR
    
    %% Styling
    classDef core fill:#e1f5fe,stroke:#01579b
    classDef state fill:#e8f5e9,stroke:#1b5e20
    classDef event fill:#fff3e0,stroke:#e65100
    classDef monitoring fill:#fce4ec,stroke:#880e4f
    classDef external fill:#f3e5f5,stroke:#4a148c
    
    class AM,SM,EL,SL core
    class DB state
    class EH event
    class PR,GF monitoring
    class TS,SO,SC external
```
## Component Requirements

### EilzaOS
- Agent stream interaction using LLM and TTS
    - 
- Character assets  
    - Stable Diffusion pre-rendered images
- Visual output
- External API integration

### Auction Manager
- NFT Lifecycle Control
    - 
- Bid Processing
    - Read tweets responding to auction tweet
- Business Logic
- System Orchestration

### Shape L2 Integration
- Smart Contracts monitoring
    - Look at smart contract from auction contract
- NFT Transfers
- Changes handled and monitored by Event Handler and served to Auction Manager

### Twitter External Feed
- User Interaction Monitoring
- Bid Monitoring
- Changes handled and monitored by Event Handler and served to Auction Manager

### Livestream Manager
- Compose livestream from auction manager 