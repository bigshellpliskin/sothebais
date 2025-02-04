import { mockLayers } from '../../../__tests__/setup';
import { GET, PUT, POST } from '../route';

describe('Control API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('GET /layers', () => {
    it('should return layers', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLayers)
      });

      const response = await GET();
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/layers', {
        headers: {
          'Accept': 'application/json'
        }
      });
      expect(data).toEqual({
        success: true,
        data: mockLayers
      });
    });

    it('should handle errors when getting layers', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const response = await GET();
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/layers', {
        headers: {
          'Accept': 'application/json'
        }
      });
      expect(data).toEqual({
        success: false,
        error: 'Failed to get layers'
      });
    });
  });

  describe('PUT /layers/:id', () => {
    const mockUrl = 'http://localhost:3000/api/stream/layers/1';
    beforeEach(() => {
      // @ts-ignore - partial implementation for testing
      global.Request = jest.fn().mockImplementation((url) => ({
        url,
        json: async () => ({
          id: 1,
          updates: { visible: true }
        })
      }));
    });

    it('should update layer', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const request = new Request(mockUrl);
      const response = await PUT(request);
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/layers/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ visible: true })
      });
      expect(data).toEqual({
        success: true
      });
    });

    it('should handle invalid layer update data', async () => {
      // @ts-ignore - partial implementation for testing
      global.Request = jest.fn().mockImplementation((url) => ({
        url,
        json: async () => ({
          invalid: 'data'
        })
      }));

      const request = new Request(mockUrl);
      const response = await PUT(request);
      const data = await response.json();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(data).toEqual({
        success: false,
        error: 'Invalid layer update data'
      });
    });
  });

  describe('POST /layers/toggle', () => {
    const mockUrl = 'http://localhost:3000/api/stream/layers/toggle';
    beforeEach(() => {
      // @ts-ignore - partial implementation for testing
      global.Request = jest.fn().mockImplementation((url) => ({
        url,
        json: async () => ({
          type: 'overlay'
        })
      }));
    });

    it('should toggle layer', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const request = new Request(mockUrl);
      const response = await POST(request);
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/layers/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ type: 'overlay' })
      });
      expect(data).toEqual({
        success: true
      });
    });

    it('should handle invalid layer type', async () => {
      // @ts-ignore - partial implementation for testing
      global.Request = jest.fn().mockImplementation((url) => ({
        url,
        json: async () => ({
          invalid: 'data'
        })
      }));

      const request = new Request(mockUrl);
      const response = await POST(request);
      const data = await response.json();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(data).toEqual({
        success: false,
        error: 'Invalid layer type'
      });
    });
  });
}); 