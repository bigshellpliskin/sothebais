// Stream Configuration Types
export interface StreamConfig {
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  bitrate: number;
  codec: 'h264' | 'vp8' | 'vp9';
  preset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  quality: 'low' | 'medium' | 'high';
}

export interface AudioConfig {
  codec: 'aac' | 'opus';
  bitrate: number;
  sampleRate: number;
  channels: number;
}

// Stream Metrics Types
export interface StreamMetrics {
  fps: number;
  bitrate: number;
  droppedFrames: number;
  encoderLatency: number;
  bufferHealth: number;
  cpuUsage: number;
  memoryUsage: number;
}

// Stream Runtime State
export interface StreamState {
  isLive: boolean;
  isPaused: boolean;
  fps: number;
  targetFPS: number;
  frameCount: number;
  droppedFrames: number;
  averageRenderTime: number;
  startTime?: number | null;
  error?: string | null;
  config?: StreamConfig;
  audio?: AudioConfig;
  metrics?: StreamMetrics;
}

// Stream Output Configuration
export interface StreamOutput {
  type: 'twitter' | 'rtmp' | 'file';
  url: string;
  key?: string;
}

// Stream Events
export type StreamEvent = 
  | { type: 'streamStart'; timestamp: number }
  | { type: 'streamStop'; timestamp: number }
  | { type: 'streamError'; error: string; timestamp: number }
  | { type: 'metricsUpdate'; metrics: StreamMetrics; timestamp: number }; 