import { logger } from '../../utils/logger.js';
import { metricsService } from '../../monitoring/metrics.js';

interface BatchedMessage {
  frames: Array<{
    timestamp: number;
    data: ArrayBuffer;
  }>;
  stateUpdates: Array<{
    type: string;
    data: unknown;
    timestamp: number;
  }>;
}

export class MessageBatcher {
  private static instance: MessageBatcher | null = null;
  private batchInterval: number = 50; // 50ms batching window
  private maxBatchSize: number = 3;   // Max frames per batch
  private batches: Map<string, BatchedMessage> = new Map();
  private batchTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  public static getInstance(): MessageBatcher {
    if (!MessageBatcher.instance) {
      MessageBatcher.instance = new MessageBatcher();
    }
    return MessageBatcher.instance;
  }

  public queueFrame(clientId: string, frame: ArrayBuffer): void {
    let batch = this.batches.get(clientId);
    if (!batch) {
      batch = { frames: [], stateUpdates: [] };
      this.batches.set(clientId, batch);
    }

    batch.frames.push({
      timestamp: Date.now(),
      data: frame
    });

    this.scheduleBatchDelivery(clientId);
  }

  public queueStateUpdate(clientId: string, type: string, data: unknown): void {
    let batch = this.batches.get(clientId);
    if (!batch) {
      batch = { frames: [], stateUpdates: [] };
      this.batches.set(clientId, batch);
    }

    batch.stateUpdates.push({
      type,
      data,
      timestamp: Date.now()
    });

    this.scheduleBatchDelivery(clientId);
  }

  private scheduleBatchDelivery(clientId: string): void {
    // Clear existing timeout if any
    const existingTimeout = this.batchTimeouts.get(clientId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Check if we should deliver immediately
    const batch = this.batches.get(clientId);
    if (batch && (batch.frames.length >= this.maxBatchSize)) {
      this.deliverBatch(clientId);
      return;
    }

    // Schedule delivery
    const timeout = setTimeout(() => {
      this.deliverBatch(clientId);
    }, this.batchInterval);

    this.batchTimeouts.set(clientId, timeout);
  }

  private deliverBatch(clientId: string): void {
    const batch = this.batches.get(clientId);
    if (!batch) return;

    try {
      if (batch.frames.length > 0 || batch.stateUpdates.length > 0) {
        const serializedBatch = this.serializeBatch(batch);
        
        // Record metrics
        metricsService.recordBatchSize(batch.frames.length);
        metricsService.recordFrameSize(serializedBatch.byteLength);
        metricsService.recordWsMessageSent('batch');
        
        // Notify listeners that a batch is ready
        this.emit('batchReady', clientId, serializedBatch);
      }
    } catch (error) {
      logger.error('Error delivering batch', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clientId
      });
    } finally {
      // Clear the batch
      this.batches.delete(clientId);
      this.batchTimeouts.delete(clientId);
    }
  }

  private serializeBatch(batch: BatchedMessage): ArrayBuffer {
    // Calculate total size needed
    const framesSize = batch.frames.reduce((total, frame) => total + frame.data.byteLength, 0);
    const stateUpdatesSize = batch.stateUpdates.reduce((total, update) => {
      return total + new TextEncoder().encode(JSON.stringify(update)).length;
    }, 0);

    // Header: 8 bytes for counts + 8 bytes for timestamps
    const headerSize = 16;
    const totalSize = headerSize + framesSize + stateUpdatesSize;

    // Create buffer and view
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let offset = 0;

    // Write header
    view.setUint32(offset, batch.frames.length);
    offset += 4;
    view.setUint32(offset, batch.stateUpdates.length);
    offset += 4;
    view.setBigUint64(offset, BigInt(Date.now()));
    offset += 8;

    // Write frames
    for (const frame of batch.frames) {
      new Uint8Array(buffer, offset, frame.data.byteLength).set(new Uint8Array(frame.data));
      offset += frame.data.byteLength;
    }

    // Write state updates
    for (const update of batch.stateUpdates) {
      const encoded = new TextEncoder().encode(JSON.stringify(update));
      new Uint8Array(buffer, offset, encoded.length).set(encoded);
      offset += encoded.length;
    }

    return buffer;
  }

  private listeners: Map<string, Set<Function>> = new Map();

  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }

  public clearClient(clientId: string): void {
    this.batches.delete(clientId);
    const timeout = this.batchTimeouts.get(clientId);
    if (timeout) {
      clearTimeout(timeout);
      this.batchTimeouts.delete(clientId);
    }
  }
}

export const messageBatcher = MessageBatcher.getInstance(); 