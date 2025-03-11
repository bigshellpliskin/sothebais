// Canvas Types
export interface Canvas {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Position extends Point2D {}

export interface CanvasTransform {
  a: number;  // scale x
  b: number;  // skew y
  c: number;  // skew x
  d: number;  // scale y
  e: number;  // translate x
  f: number;  // translate y
}

export interface Transform {
  scale: number;
  rotation: number;
  anchor: { x: number; y: number };
  opacity: number;
}

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// Asset Types
export interface Asset {
  id: string;
  type: 'image' | 'text' | 'video' | 'stream' | 'overlay';
  source: string;
  position: Position;
  transform: Transform;
  visible: boolean;
  zIndex: number;
  metadata?: Record<string, unknown>;
}

// Quadrant Types
export type QuadrantId = 0 | 1 | 2 | 3 | 4;  // 0 = absolute positioning, 1-4 = quadrants

export interface Quadrant {
  id: QuadrantId;
  name: string;
  bounds: Bounds;
  padding: number;
  assets: Asset[];  // Assets in this quadrant
}

// Scene Structure
export interface Scene {
  id: string;
  name: string;
  background: Asset[];     // Fixed bottom assets
  quadrants: Map<QuadrantId, Quadrant>;  // Quadrant-positioned assets
  overlay: Asset[];        // Fixed top assets
  metadata?: Record<string, unknown>;
} 