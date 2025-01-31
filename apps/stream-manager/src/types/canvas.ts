export interface Point2D {
  x: number;
  y: number;
}

export interface Transform {
  a: number;  // scale x
  b: number;  // skew y
  c: number;  // skew x
  d: number;  // scale y
  e: number;  // translate x
  f: number;  // translate y
}

// Re-export types from @napi-rs/canvas that we need
export type { CanvasRenderingContext2D, Canvas } from '@napi-rs/canvas'; 