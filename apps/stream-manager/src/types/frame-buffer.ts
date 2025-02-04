/**
 * Represents a frame buffer that can be used for image processing and effects.
 */
export interface FrameBuffer {
  /** The raw buffer containing the frame data */
  buffer: Buffer;
  
  /** The width of the frame in pixels */
  width: number;
  
  /** The height of the frame in pixels */
  height: number;
  
  /** The pixel format of the frame (e.g., 'rgba', 'rgb') */
  format: 'rgba' | 'rgb';
  
  /** The number of channels in the frame (e.g., 4 for RGBA, 3 for RGB) */
  channels: number;
  
  /** The size of the buffer in bytes */
  size: number;
}

/**
 * Configuration options for the frame buffer manager.
 */
export interface FrameBufferConfig {
  /** The width of frames to manage */
  width: number;
  
  /** The height of frames to manage */
  height: number;
  
  /** The pixel format to use */
  format?: 'rgba' | 'rgb';
  
  /** The size of the frame buffer pool */
  poolSize?: number;
}

/**
 * Effect that can be applied to a frame buffer.
 */
export interface FrameEffect {
  /** The type of effect to apply */
  type: 'blur' | 'brightness' | 'contrast' | 'saturation' | 'sharpen';
  
  /** The strength of the effect (0-1) */
  strength: number;
  
  /** Whether the effect is enabled */
  enabled: boolean;
} 