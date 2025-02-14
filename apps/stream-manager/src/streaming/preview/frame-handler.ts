import { EventType, EventSource } from '../../types/events.js';
import type { PreviewEvent } from '../../types/events.js';
import type { PreviewClientState } from '../../types/state-manager.js';
import type { StateManager } from '../../types/state-manager.js';
import { stateManager } from '../../state/state-manager.js';
import { eventEmitter } from '../../state/event-emitter.js';
import { logger } from '../../utils/logger.js';
import { messageBatcher } from './message-batcher.js';

interface FrameQualityConfig {
  maxFPS: number;
  compression: number;  // 0-100
  maxWidth: number;
  maxHeight: number;
}

const QUALITY_CONFIGS: Record<PreviewClientState['quality'], FrameQualityConfig> = {
  high: {
    maxFPS: 30,
    compression: 85,
    maxWidth: 1920,
    maxHeight: 1080
  },
  medium: {
    maxFPS: 20,
    compression: 75,
    maxWidth: 1280,
    maxHeight: 720
  },
  low: {
    maxFPS: 10,
    compression: 60,
    maxWidth: 854,
    maxHeight: 480
  }
};

export class PreviewFrameHandler {
  private static instance: PreviewFrameHandler | null = null;
  private frameBuffer: Map<string, Set<ArrayBuffer>> = new Map();
  private lastFrameTime: Map<string, number> = new Map();
  private processingFrame: Map<string, boolean> = new Map();

  private constructor() {
    this.startFrameProcessor();
    this.setupMessageBatcher();
  }

  private setupMessageBatcher(): void {
    messageBatcher.on('batchReady', (clientId: string, batchedData: ArrayBuffer) => {
      this.sendBatchToClient(clientId, batchedData);
    });
  }

  private async sendBatchToClient(clientId: string, batchedData: ArrayBuffer): Promise<void> {
    try {
      const event: PreviewEvent = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: EventType.PREVIEW_FRAME,
        source: EventSource.STATE_MANAGER,
        payload: {
          clientId,
          current: stateManager.getPreviewClients()[clientId],
          changes: ['frame'],
          frame: batchedData
        }
      };

      await eventEmitter.emit(event);
    } catch (error) {
      logger.error('Error sending batch to client', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clientId
      });
    }
  }

  public static getInstance(): PreviewFrameHandler {
    if (!PreviewFrameHandler.instance) {
      PreviewFrameHandler.instance = new PreviewFrameHandler();
    }
    return PreviewFrameHandler.instance;
  }

  private async startFrameProcessor(): Promise<void> {
    setInterval(() => this.processFrameBuffer(), 16);
  }

  private getFrameInterval(quality: PreviewClientState['quality']): number {
    return 1000 / QUALITY_CONFIGS[quality].maxFPS;
  }

  public async queueFrame(clientId: string, frame: ArrayBuffer): Promise<void> {
    if (!this.frameBuffer.has(clientId)) {
      this.frameBuffer.set(clientId, new Set());
    }
    
    const buffer = this.frameBuffer.get(clientId)!;
    buffer.add(frame);

    if (buffer.size > 3) {
      const oldestFrame = buffer.values().next().value;
      buffer.delete(oldestFrame);
    }
  }

  private async processFrameBuffer(): Promise<void> {
    const clients = stateManager.getPreviewClients();

    for (const [clientId, clientState] of Object.entries(clients)) {
      if (!clientState.connected) continue;
      if (this.processingFrame.get(clientId)) continue;

      const buffer = this.frameBuffer.get(clientId);
      if (!buffer || buffer.size === 0) continue;

      const now = Date.now();
      const lastFrame = this.lastFrameTime.get(clientId) || 0;
      const interval = this.getFrameInterval(clientState.quality);

      if (now - lastFrame < interval) continue;

      this.processingFrame.set(clientId, true);

      try {
        const frame = buffer.values().next().value;
        buffer.delete(frame);

        const optimizedFrame = await this.optimizeFrame(frame, clientState.quality);
        
        // Queue the frame for batching instead of sending immediately
        messageBatcher.queueFrame(clientId, optimizedFrame);
        
        this.lastFrameTime.set(clientId, now);
      } catch (error) {
        logger.error('Error processing preview frame', {
          error: error instanceof Error ? error.message : 'Unknown error',
          clientId
        });
      } finally {
        this.processingFrame.set(clientId, false);
      }
    }
  }

  private async optimizeFrame(frame: ArrayBuffer, quality: PreviewClientState['quality']): Promise<ArrayBuffer> {
    const config = QUALITY_CONFIGS[quality];
    
    // Convert ArrayBuffer to ImageData
    const blob = new Blob([frame], { type: 'image/jpeg' });
    const imageBitmap = await createImageBitmap(blob);
    
    // Create canvas for manipulation
    const canvas = new OffscreenCanvas(
      Math.min(imageBitmap.width, config.maxWidth),
      Math.min(imageBitmap.height, config.maxHeight)
    );
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Draw and resize
    ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

    // Convert to compressed JPEG
    const blob2 = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: config.compression / 100
    });

    // Convert to ArrayBuffer
    return await blob2.arrayBuffer();
  }

  public clearClientBuffer(clientId: string): void {
    this.frameBuffer.delete(clientId);
    this.lastFrameTime.delete(clientId);
    this.processingFrame.delete(clientId);
    messageBatcher.clearClient(clientId);
  }
}

export const previewFrameHandler = PreviewFrameHandler.getInstance(); 