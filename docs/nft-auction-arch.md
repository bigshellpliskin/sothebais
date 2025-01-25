```mermaid
graph TD
    %% Core System Components
    subgraph CoreSystem[Core System Components]
        AM[Auction Manager<br>- Auction Lifecycle Control<br>- Daily Bid Windows<br>- Bid Processing<br>- System Orchestration]
        LM[Livestream Manager<br>- Stream Composition<br>- Layer Management<br>- Twitter Stream Output]
        EL[ElizaOS<br>- LLM Integration<br>- TTS System<br>- Stable Diffusion<br>- Character Assets<br>- Livestream Agent]
        SL[Shape L2 Integration<br>- Smart Contract Monitor<br>- NFT Transfers<br>- Wallet Tracking]
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
        TS[Twitter Stream<br>- User Interaction<br>- Bid Monitoring<br>- Tweet Format Validation]
        SO[Stream Output<br>- Host Layer<br>- Assistant Layer<br>- Visual Feed Layer]
        SC[Smart Contracts<br>- Auction Contract<br>- NFT Wallet]
    end

    %% Core Control Flow - Auction Manager Driven
    AM --> LM
    AM --> EL
    AM --> SL
    
    %% Event Handler as Aggregator
    EH --> AM
    TS --> EH
    SC --> EH
    
    %% Component to External Flow
    LM --> TS
    LM --> SO
    EL --> LM
    SL --> SC
    
    %% State Connections
    DB --> AM
    AM --> DB
    
    %% Monitoring Connections
    PR --> AM
    PR --> LM
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
    
    class AM,LM,EL,SL core
    class DB state
    class EH event
    class PR,GF monitoring
    class TS,SO,SC external
```
## Component Requirements

### EilzaOS
- Livestream Agent System enabling realtime stream/user interaction using:
        - LLM
        - TTS
        - Stable Diffusion pre-rendered images. 
- Character Assets
    - Anime/Vtuber aesthetic
    - Auction Host
    - Auction Assistants
        - Male and Female
        - Silly, professional art interns
        
### Auction Manager
- Auction Lifecycle Management
    - Preset time duration of stream/auction marathon. "Every day for n days." Ex: 30 days.
    - Daily bid start and end time. Ex: 3PM - 4PM EST.
- Bid Processing & Logic
    - Read tweets responding to auction tweet
    - Only accepts bids/tweets with certain format.
- System Orchestration
    - Main control system for auction and application process.

### Shape L2 Integration
- Smart Contracts monitoring
    - Look at auction contract/wallet that holds the NFT.
- NFT Transfers
- Changes handled and monitored by Event Handler and served to Auction Manager

### Twitter External Feed
- User Interaction Monitoring
- Bid Monitoring
- Changes handled and monitored by Event Handler and served to Auction Manager

### Livestream Manager
- Compose livestream from auction manager
- Stream Composition Layers (Front to Back)
    - Auction Host
    - Auction Assistants
    - Visual Feeds
- Stream to X/twitter
