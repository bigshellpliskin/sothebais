class MockFrameBufferManager {
  private static instance: MockFrameBufferManager;

  private constructor() {}

  static getInstance(): MockFrameBufferManager {
    if (!MockFrameBufferManager.instance) {
      MockFrameBufferManager.instance = new MockFrameBufferManager();
    }
    return MockFrameBufferManager.instance;
  }

  async pushFrame(frame: Buffer): Promise<void> {
    // Mock implementation
  }

  async getLatestFrame(): Promise<Buffer | null> {
    return Buffer.from('mock-frame-data');
  }
}

export { MockFrameBufferManager as FrameBufferManager }; 