export interface ViewportDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ViewportPosition {
  x: number;
  y: number;
}

export interface ViewportTransform {
  scale: number;
  rotation: number;
}

export interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ViewportConfig {
  width: number;
  height: number;
  gridSize?: number;
  safeAreaMargin?: {
    x: number;
    y: number;
  };
} 