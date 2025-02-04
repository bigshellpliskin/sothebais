import type { Layer } from '../../types/layers.js';

class MockSharpRenderer {
  private static instance: MockSharpRenderer;

  private constructor() {}

  static getInstance(): MockSharpRenderer {
    if (!MockSharpRenderer.instance) {
      MockSharpRenderer.instance = new MockSharpRenderer();
    }
    return MockSharpRenderer.instance;
  }

  async composite(layers: Layer[]): Promise<Buffer> {
    // Return a mock buffer for testing
    return Buffer.from('mock-image-data');
  }

  clearCache(): void {
    // Mock implementation
  }
}

export { MockSharpRenderer as SharpRenderer }; 