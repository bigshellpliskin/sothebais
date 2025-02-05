export type TaskPriority = 'high' | 'normal' | 'low';

export interface RenderTask {
  width: number;
  height: number;
  layers: any[]; // Will be replaced with proper Layer type
  effects?: any[]; // Will be replaced with proper Effect type
} 