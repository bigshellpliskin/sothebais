# Stream Manager Core System

The core system provides the fundamental building blocks for the Stream Manager service, handling scene composition and asset management. This directory contains the core domain logic that powers the streaming experience.

## Architecture

### Component Relationships
```mermaid
graph TD
    subgraph Core ["Core Components"]
        direction TB
        Scene[Scene Manager]
        Assets[Asset Manager]
        Composition[Composition Engine]
        
        %% Core relationships
        Assets -->|"Provides asset resources"| Scene
        Scene -->|"Provides scene state"| Composition
    end

    subgraph External ["External Systems"]
        direction TB
        Files[(Asset Files)]
        Sharp[Sharp Image Processing]
        State[State Management]
        Pipeline[Pipeline Processing]
        
        %% External relationships
        Files -->|"Raw assets"| Assets
        Sharp -->|"Image processing"| Composition
        Scene -->|"Scene updates"| State
        Composition -->|"Rendered frames"| Pipeline
    end

    classDef core fill:#e1f5fe,stroke:#01579b;
    classDef external fill:#f3e5f5,stroke:#4a148c;
    
    class Scene,Assets,Composition core;
    class Files,Sharp,State,Pipeline external;
```

### Data Flow
```mermaid
flowchart TD
    subgraph Input ["External Input"]
        Files[(Asset Files)]
        API[REST API]
        State[State Management]
    end

    subgraph Core ["Core Processing"]
        direction TB
        
        subgraph AM ["Asset Management"]
            Load[Load Asset]
            Cache[Asset Cache]
            Process[Process Asset]
        end

        subgraph SM ["Scene Management"]
            Canvas[Canvas Properties]
            Quadrants[Quadrant System]
            Scene[Scene Structure]
            Position[Position Management]
        end

        subgraph CM ["Composition"]
            Background[Background Assets]
            QuadrantAssets[Quadrant Assets]
            Overlay[Overlay Assets]
            Render[Frame Rendering]
        end
    end

    subgraph Output ["Output"]
        Pipeline[Pipeline Processing]
        Encoder[Frame Encoder]
        Events[State Events]
        WSUpdates[WebSocket Updates]
    end

    %% Input relationships
    Files --> Load
    State -->|"Scene state"| Scene
    API -->|"Scene updates"| State

    %% Asset Management flow
    Load --> Cache
    Cache --> Process
    Process --> Scene

    %% Scene Management flow
    Canvas --> Position
    Quadrants --> Position
    Position --> Scene

    %% Composition flow
    Scene --> Background
    Scene --> QuadrantAssets
    Scene --> Overlay
    Background --> Render
    QuadrantAssets --> Render
    Overlay --> Render
    Render -->|"Frames"| Pipeline
    Pipeline -->|"Processed frames"| Encoder
    
    %% State and API events
    Scene -->|"Scene changes"| State
    State -->|"State updates"| WSUpdates
    State -->|"Sync"| API

    classDef input fill:#e8f5e9,stroke:#2e7d32;
    classDef core fill:#e3f2fd,stroke:#1565c0;
    classDef output fill:#fce4ec,stroke:#c2185b;
    
    class Files,API,State input;
    class Load,Cache,Process,Canvas,Quadrants,Scene,Position,Background,QuadrantAssets,Overlay,Render core;
    class Pipeline,Encoder,Events,WSUpdates output;
```

## Components

### 1. Scene Manager (`scene-manager.ts`)
The central manager for scene organization and state:
- Scene creation and management
- Asset positioning in quadrants
- Background and overlay management
- Scene transitions
- Canvas properties and safe areas

Features:
- Scene state management
- Quadrant-based positioning
- Z-index ordering within containers
- Scene transitions
- Asset organization (background, quadrants, overlay)

### 2. Composition Engine (`composition.ts`)
Pure rendering engine that takes scenes and produces frames:
- Direct scene rendering
- Asset composition in correct order
- Background, quadrant, and overlay rendering
- Frame caching and optimization

Key features:
- High-performance Sharp-based rendering
- Z-index based compositing
- Render caching
- Asset transformations

### 3. Asset Manager (`assets.ts`)
Resource provider for the scene system:
- Asset loading and processing
- Resource caching
- Asset type management
- Memory optimization

Features:
- Multi-type asset support
- Resource caching
- Memory management
- Asset preprocessing

## Scene Structure

```typescript
interface Scene {
  id: string;
  name: string;
  background: Asset[];     // Fixed bottom assets
  quadrants: Map<QuadrantId, Quadrant>;  // Quadrant-positioned assets
  overlay: Asset[];        // Fixed top assets
  metadata?: Record<string, unknown>;
}
```

### Asset Positioning
1. **Background Assets**: Fixed at bottom, absolute positioning
2. **Quadrant Assets**: Positioned relative to quadrant bounds
3. **Overlay Assets**: Fixed at top, absolute positioning

### Quadrant System
- 4 fixed quadrants (1-4)
- Each quadrant has its own bounds and padding
- Assets within quadrants are positioned relative to quadrant bounds
- Z-index ordering within each quadrant

## Performance

### Optimizations
1. **Asset Caching**
   - In-memory caching
   - Asset type-specific processing
   - Metadata caching

2. **Composition**
   - Container-based rendering
   - Z-index sorting
   - Quadrant-based optimization
   - Sharp operations

3. **Scene Management**
   - Efficient scene state updates
   - Optimized asset positioning
   - Event batching

## Error Handling

The core system implements comprehensive error handling:
- Asset loading errors
- Composition failures
- Scene validation
- Type validation
- Resource management

## Development

### Prerequisites
- Node.js 18+
- Sharp for image processing
- TypeScript 5+

### Best Practices
1. Use singleton pattern for managers
2. Implement proper error handling
3. Emit events for state changes
4. Validate scene structure
5. Maintain type safety
6. Document public APIs

## Future Improvements

1. **Asset Management**
   - Video frame extraction
   - Text rendering system
   - VTuber model support
   - Advanced caching

2. **Composition**
   - Hardware acceleration
   - WebGL integration
   - Custom shaders
   - Advanced effects

3. **Scene Management**
   - Scene templates
   - Advanced transitions
   - Asset animation
   - Dynamic quadrants