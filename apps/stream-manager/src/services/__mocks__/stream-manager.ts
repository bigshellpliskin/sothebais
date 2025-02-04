import { EventEmitter } from 'events';

class MockStreamManager extends EventEmitter {
  private static instance: MockStreamManager;

  private constructor() {
    super();
  }

  static getInstance(): MockStreamManager {
    if (!MockStreamManager.instance) {
      MockStreamManager.instance = new MockStreamManager();
    }
    return MockStreamManager.instance;
  }

  emit(event: string, data: any): boolean {
    return super.emit(event, data);
  }
}

export { MockStreamManager as StreamManager }; 