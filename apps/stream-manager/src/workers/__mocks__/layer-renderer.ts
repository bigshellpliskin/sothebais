import type { GenericLayer } from '../../types/layers.js';

class MockLayerRenderer {
  private static instance: MockLayerRenderer;

  private constructor() {}

  static getInstance(): MockLayerRenderer {
    if (!MockLayerRenderer.instance) {
      MockLayerRenderer.instance = new MockLayerRenderer();
    }
    return MockLayerRenderer.instance;
  }

  async renderFrame(width: number, height: number): Promise<Buffer> {
    // Return a mock buffer for testing
    return Buffer.from('mock-frame-data');
  }

  clearCache(): void {
    // Mock implementation
  }
}

export { MockLayerRenderer as LayerRenderer };
export const layerRenderer = MockLayerRenderer.getInstance(); 