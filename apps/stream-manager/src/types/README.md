# Stream Manager Types

This directory contains TypeScript type definitions used throughout the Stream Manager application.

## Type Definitions

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

## Type Categories

1. **Layer Types**
   - Base layer structure
   - Specific layer variants
   - Layer content types
   - Layer transformations

2. **Animation Types**
   - Animation properties
   - Transition definitions
   - Easing functions
   - Keyframe types

3. **Buffer Types**
   - Frame buffer structure
   - Pixel formats
   - Color spaces
   - Memory management

4. **Stream Types**
   - Stream configuration
   - Event definitions
   - State management
   - Metrics types

## Usage Examples

### Layer Management

```typescript
import type { Layer, Transform, Point2D } from '../types/layers';

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
  },
  content: {
    type: 'text',
    content: 'Hello World',
    style: {
      fontSize: 24,
      color: '#ffffff'
    }
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