import { mockFrameBuffer, createTestRequest } from '../../../__tests__/setup';
import { GET, POST } from '../route';

describe('Frame API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /frame', () => {
    it('should return frame buffer', async () => {
      const mockBlob = new Blob(['test-frame-data'], { type: 'image/png' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      });

      const response = await GET();
      expect(response.headers.get('Content-Type')).toBe('image/png');
      const blob = await response.blob();
      expect(blob).toBeDefined();

      expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/frame', {
        headers: {
          'Accept': 'image/png'
        },
        cache: 'no-store'
      });
    });

    it('should handle errors when getting frame buffer', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const response = await GET();
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/frame', {
        headers: {
          'Accept': 'image/png'
        },
        cache: 'no-store'
      });
      expect(data).toEqual({
        success: false,
        error: 'Failed to get frame buffer'
      });
    });
  });

  describe('POST /frame/config', () => {
    const mockUrl = 'http://localhost:3000/api/stream/frame/config';

    it('should update frame configuration', async () => {
      const config = {
        width: 1920,
        height: 1080,
        fps: 60,
        format: 'rgba'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const request = createTestRequest({
        method: 'POST',
        url: mockUrl,
        body: config
      });
      const response = await POST(request);
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/frame/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(config)
      });
      expect(data).toEqual({
        success: true
      });
    });

    it('should handle invalid frame configuration', async () => {
      const request = createTestRequest({
        method: 'POST',
        url: mockUrl,
        body: { invalid: 'data' }
      });
      const response = await POST(request);
      const data = await response.json();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(data).toEqual({
        success: false,
        error: 'Invalid frame configuration'
      });
    });
  });
}); 