import { parentPort } from 'worker_threads';
import { createCanvas } from '@napi-rs/canvas';
import { SharpRenderer } from '../pipeline/sharp-renderer.js';
import type { Layer } from '../types/layers.js';
// ... existing code ...