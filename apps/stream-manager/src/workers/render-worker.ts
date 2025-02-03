import { parentPort } from 'worker_threads';
import { createCanvas } from '@napi-rs/canvas';
import type { Layer } from '../types/layers.js';
import { characterRenderer } from '../renderers/character-renderer.js';
import { visualFeedRenderer } from '../renderers/visual-feed-renderer.js';
import { overlayRenderer } from '../renderers/overlay-renderer.js';
import { chatRenderer } from '../renderers/chat-renderer.js';
// ... existing code ...