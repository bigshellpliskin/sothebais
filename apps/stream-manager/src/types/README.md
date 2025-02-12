# Stream Manager Types

This directory contains TypeScript type definitions used throughout the Stream Manager application.

## Type Definitions

### Configuration Types (`config.ts`)

Core configuration types using Zod for validation:

```typescript
export const configSchema = z.object({
  // Server Configuration
  PORT: z.number().default(4200),
  WS_PORT: z.number().default(4201),
  METRICS_PORT: z.number().default(9090),

  // Core Settings
  VIEWPORT_WIDTH: z.number().default(1920),
  VIEWPORT_HEIGHT: z.number().default(1080),
  ASSET_STORAGE_PATH: z.string().default('./assets'),
  MAX_LAYERS: z.number().default(10),

  // Stream Settings
  STREAM_RESOLUTION: z.string().default('1920x1080'),
  TARGET_FPS: z.number().default(30),
  STREAM_BITRATE: z.string().default('6000k'),
  ENABLE_HARDWARE_ACCELERATION: z.boolean().default(false)
});

// Specific config interfaces
export interface WorkerPoolConfig {
  poolSize: number;
  taskQueueSize: number;
  taskTimeout?: number;
}

export interface RenderConfig {
  quality: 'low' | 'medium' | 'high';
  frameBuffer: number;
  dropFrames: boolean;
  metricsInterval: number;
}
```

### Core Service Types (`core.ts`)

Types for core domain services:

```typescript
export interface CoreService {
  cleanup(): Promise<void>;
}

export interface ViewportManager extends CoreService {
  getWidth(): number;
  getHeight(): number;
  resize(width: number, height: number): Promise<void>;
}

export interface AssetManager extends CoreService {
  loadAsset(id: string): Promise<Buffer>;
  storeAsset(id: string, data: Buffer): Promise<void>;
  deleteAsset(id: string): Promise<void>;
}
```

### Layer Types (`layers.ts`)

Core type definitions for stream layers:

```typescript
// Base types
export type Point2D = { x: number; y: number };
export type Transform = {
  position: Point2D;
  scale: Point2D;
  rotation: number;
  anchor: Point2D;
};

// Layer types
export type LayerType = 'host' | 'assistant' | 'visualFeed' | 'overlay' | 'chat';

// Base layer interface
export interface BaseLayer {
  id: string;
  type: LayerType;
  zIndex: number;
  visible: boolean;
  opacity: number;
  transform: Transform;
}

// Specific layer types
export interface HostLayer extends BaseLayer {
  type: 'host';
  character: VTuberCharacter;
}

export interface OverlayLayer extends BaseLayer {
  type: 'overlay';
  content: OverlayContent;
}

// Union type for all layers
export type Layer = HostLayer | AssistantLayer | VisualFeedLayer | OverlayLayer | ChatLayer;
```

### Animation Types (`animation.ts`)

Types for animation and transitions:

```typescript
export interface Animation {
  duration: number;
  easing: EasingFunction;
  delay?: number;
  repeat?: number;
}

export interface Transition {
  from: number | Point2D;
  to: number | Point2D;
  animation: Animation;
}
```

### Frame Buffer Types (`frame-buffer.ts`)

Types for frame buffer management:

```typescript
export interface FrameBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  format: PixelFormat;
}

export interface PixelFormat {
  channels: number;
  bytesPerPixel: number;
  colorSpace: ColorSpace;
}
```

### Stream Types (`stream.ts`)

Types for stream configuration and events:

```typescript
export interface StreamConfig {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: CodecType;
}

export interface StreamEvent {
  type: StreamEventType;
  timestamp: number;
  data?: any;
}
```

### Canvas Types (`canvas.ts`)

Types for canvas operations:

```typescript
export interface CanvasContext {
  width: number;
  height: number;
  scale: number;
  backgroundColor: string;
}

export interface DrawOptions {
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  opacity?: number;
}
```

### Worker Types (`worker.ts`)

Types for worker pool and task management:

```typescript
export interface WorkerTask {
  message: RenderWorkerMessage;
  resolve: (value: RenderWorkerResponse) => void;
  reject: (reason: any) => void;
  priority: TaskPriority;
  addedTime: number;
}

export interface WorkerState {
  isProcessing: boolean;
  processedTasks: number;
  errors: number;
  totalProcessingTime: number;
  startTime: number;
  config?: WorkerConfig;
}
```

## Type Categories

1. **Configuration Types**
   - Server configuration
   - Core service settings
   - Stream settings
   - Worker pool configuration
   - Render configuration
   - Effects configuration
   - Buffer configuration

2. **Core Service Types**
   - Base service interface
   - Viewport management
   - Asset management
   - Layout management
   - Composition engine

3. **Layer Types**
   - Base layer structure
   - Specific layer variants
   - Layer content types
   - Layer transformations

4. **Worker Types**
   - Worker pool configuration
   - Task management
   - Worker state
   - Message types

5. **Stream Types**
   - Stream configuration
   - Event definitions
   - State management
   - Metrics types

## Usage Examples

### Configuration Usage

```typescript
import { loadConfig } from '../config';
import type { Config } from '../types/config';

// Load and validate configuration
const config = await loadConfig();

// Initialize services with config
const viewport = await ViewportManager.initialize(config);
const assets = await AssetManager.initialize(config);
```

### Worker Pool Usage

```typescript
import { WorkerPoolManager } from '../workers/pool/manager';
import type { WorkerPoolConfig } from '../types/config';

const poolConfig: WorkerPoolConfig = {
  poolSize: 4,
  taskQueueSize: 30,
  taskTimeout: 5000
};

const pool = await WorkerPoolManager.initialize(poolConfig);
```

### Layer Management

```typescript
import type { Layer, Transform } from '../types/layers';

const layer: Layer = {
  id: 'overlay-1',
  type: 'overlay',
  zIndex: 1,
  visible: true,
  opacity: 1,
  transform: {
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    anchor: { x: 0.5, y: 0.5 }
  }
};
```

### Animation Usage

```typescript
import type { Animation, Transition } from '../types/animation';

const fadeIn: Animation = {
  duration: 1000,
  easing: 'easeInOut',
  delay: 0,
  repeat: 0
};

const moveTransition: Transition = {
  from: { x: 0, y: 0 },
  to: { x: 100, y: 100 },
  animation: fadeIn
};
```

### Frame Buffer Usage

```typescript
import type { FrameBuffer, PixelFormat } from '../types/frame-buffer';

const buffer: FrameBuffer = {
  width: 1920,
  height: 1080,
  data: new Uint8ClampedArray(1920 * 1080 * 4),
  format: {
    channels: 4,
    bytesPerPixel: 4,
    colorSpace: 'rgba'
  }
};
``` 