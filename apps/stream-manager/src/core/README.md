# Stream Manager Core System

The core system provides the fundamental building blocks for the Stream Manager service, handling scene composition, layout management, viewport control, and asset management. This directory contains the core domain logic that powers the streaming experience.

## Architecture

### Component Relationships
```mermaid
graph TD
    subgraph Core ["Core Components"]
        direction TB
        Viewport[Viewport Manager]
        Layout[Layout Manager]
        Assets[Asset Manager]
        Composition[Composition Engine]
        
        %% Core relationships
        Viewport -->|"Provides coordinate system,\nsafe areas, grid"| Layout
        Assets -->|"Provides loaded assets,\ncached resources"| Layout
        Layout -->|"Provides scene structure,\nasset ordering"| Composition
        Assets -->|"Provides processed assets,\ncached buffers"| Composition
        Viewport -->|"Provides dimensions,\naspect ratio"| Composition
    end

    subgraph External ["External Systems"]
        direction TB
        Files[(Asset Files)]
        Sharp[Sharp Image Processing]
        State[State Management]
        Renderer[Rendering System]
        
        %% External relationships
        Files -->|"Raw assets"| Assets
        Sharp -->|"Image processing"| Assets
        Sharp -->|"Compositing"| Composition
        Layout -->|"Scene updates"| State
        Composition -->|"Rendered frames"| Renderer
    end

    classDef core fill:#e1f5fe,stroke:#01579b;
    classDef external fill:#f3e5f5,stroke:#4a148c;
    
    class Viewport,Layout,Assets,Composition core;
    class Files,Sharp,State,Renderer external;
```

### Data Flow
```mermaid
flowchart TD
    subgraph Input ["Asset Input"]
        Files[(Asset Files)]
        Config[Asset Config]
    end

    subgraph Core ["Core Processing"]
        direction TB
        
        subgraph AM ["Asset Management"]
            Load[Load Asset]
            Cache[Asset Cache]
            Process[Process Asset]
        end

        subgraph VM ["Viewport Management"]
            Coords[Coordinate System]
            Grid[Grid System]
            Safe[Safe Areas]
        end

        subgraph LM ["Layout Management"]
            Scene[Scene Structure]
            Assets[Asset Ordering]
            Position[Position Management]
        end

        subgraph CM ["Composition"]
            Composite[Layer Composition]
            Transform[Asset Transformation]
            Render[Frame Rendering]
        end
    end

    subgraph Output ["Output"]
        Frame[Frame Buffer]
        Events[State Events]
    end

    %% Input relationships
    Files --> Load
    Config --> Process

    %% Asset Management flow
    Load --> Cache
    Cache --> Process
    Process --> Assets
    Process --> Transform

    %% Viewport Management flow
    Coords --> Position
    Grid --> Position
    Safe --> Position

    %% Layout Management flow
    Position --> Scene
    Assets --> Scene
    Scene --> Composite

    %% Composition flow
    Transform --> Composite
    Composite --> Render
    Render --> Frame
    
    %% State events
    Scene --> Events
    Position --> Events
    Transform --> Events

    classDef input fill:#e8f5e9,stroke:#2e7d32;
    classDef core fill:#e3f2fd,stroke:#1565c0;
    classDef output fill:#fce4ec,stroke:#c2185b;
    
    class Files,Config input;
    class Load,Cache,Process,Coords,Grid,Safe,Scene,Assets,Position,Composite,Transform,Render core;
    class Frame,Events output;
```

### Component Responsibilities
```mermaid
graph TB
    subgraph Viewport ["Viewport Manager"]
        VP1[Coordinate System]
        VP2[Safe Areas]
        VP3[Grid System]
        VP4[Aspect Ratio]
    end

    subgraph Assets ["Asset Manager"]
        AM1[Asset Loading]
        AM2[Cache Management]
        AM3[Type Processing]
        AM4[Metadata]
    end

    subgraph Layout ["Layout Manager"]
        LM1[Scene Management]
        LM2[Asset Organization]
        LM3[Position Validation]
        LM4[Transitions]
    end

    subgraph Composition ["Composition Engine"]
        CE1[Layer Rendering]
        CE2[Asset Transformation]
        CE3[Frame Generation]
        CE4[Cache Management]
    end

    classDef manager fill:#e1f5fe,stroke:#01579b;
    class VP1,VP2,VP3,VP4,AM1,AM2,AM3,AM4,LM1,LM2,LM3,LM4,CE1,CE2,CE3,CE4 manager;
```

## Components

### 1. Composition Engine (`composition.ts`)
The heart of the rendering pipeline, responsible for scene composition:
- Scene rendering with Sharp
- Asset composition and layering
- Transition management
- Performance optimization with caching
- Event-based updates

Key features:
- High-performance image processing
- Layer compositing with z-index support
- Asset transformation (scale, rotation, opacity)
- Cache management for rendered assets
- Error handling and logging

### 2. Layout Manager (`layout.ts`)
Manages scenes, assets, and their arrangements:
- Scene creation and management
- Asset positioning and transformation
- Z-index ordering
- Grid snapping
- Scene transitions

Features:
- Scene lifecycle management
- Asset CRUD operations
- Safe area constraints
- Grid-based positioning
- Event emission for state changes

### 3. Viewport Manager (`viewport.ts`)
Controls the viewing area and coordinate systems:
- Viewport dimensions
- Safe area management
- Coordinate transformation
- Grid system
- Position constraints

Capabilities:
- Relative/absolute coordinate conversion
- Grid snapping
- Safe area enforcement
- Aspect ratio management
- Event-based updates

### 4. Asset Manager (`assets.ts`)
Handles all asset-related operations:
- Asset loading and caching
- Type-specific processing
- Metadata management
- Memory optimization
- Preloading system

Features:
- Multi-type asset support (image, video, text, vtuber, overlay)
- Efficient caching system
- Batch preloading
- Memory management
- Sharp integration for image processing

## Integration

### State Integration
```typescript
import { StateManager } from '../state/state-manager';
import { LayoutManager } from './layout';

// State updates
layoutManager.on('scene:updated', (scene) => {
  stateManager.updateScene(scene);
});
```

### Rendering Integration
```typescript
import { CompositionEngine } from './composition';
import { Renderer } from '../rendering/renderer';

// Frame rendering
compositionEngine.on('frame:ready', (frame) => {
  renderer.processFrame(frame);
});
```

## Performance

### Optimizations
1. **Asset Caching**
   - In-memory caching
   - TTL-based invalidation
   - Metadata caching
   - Batch preloading

2. **Composition**
   - Layer-based rendering
   - Cached transformations
   - Efficient Sharp operations
   - Memory pooling

3. **Layout**
   - Grid-based snapping
   - Efficient asset ordering
   - Optimized scene transitions
   - Event batching

## Error Handling

The core system implements comprehensive error handling:
- Asset loading errors
- Composition failures
- Layout constraints
- Type validation
- Resource management

## Development

### Prerequisites
- Node.js 18+
- Sharp for image processing
- Redis for state management
- TypeScript 5+

### Best Practices
1. Use singleton pattern for managers
2. Implement proper error handling
3. Emit events for state changes
4. Validate input parameters
5. Maintain type safety
6. Document public APIs

## Related Components

- **Rendering System**: Processes composed frames
- **State Manager**: Handles state persistence
- **Streaming System**: Manages output delivery
- **Worker System**: Handles CPU-intensive tasks

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

3. **Layout**
   - Advanced constraints
   - Animation system
   - Template support
   - Layout presets