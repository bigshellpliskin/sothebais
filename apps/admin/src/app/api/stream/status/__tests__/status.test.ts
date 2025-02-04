import { mockStreamStatus } from '../../../__tests__/setup';
import { GET } from '../route';

describe('Stream Status API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return stream status', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStreamStatus)
    });

    const response = await GET();
    const data = await response.json();

    expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/status', {
      headers: {
        'Accept': 'application/json'
      }
    });
    expect(data).toEqual({
      success: true,
      data: mockStreamStatus
    });
  });

  it('should handle errors properly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const response = await GET();
    const data = await response.json();

    expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/status', {
      headers: {
        'Accept': 'application/json'
      }
    });
    expect(data).toEqual({
      success: false,
      error: 'Failed to get stream status'
    });
  });
}); 