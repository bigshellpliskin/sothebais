import { createTestRequest } from '../../../__tests__/setup';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock fetch globally
global.fetch = jest.fn();

describe('Stream Config API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return formatted stream configuration', async () => {
    const mockStreamConfig = {
      STREAM_RESOLUTION: '1920x1080',
      TARGET_FPS: 60,
      RENDER_QUALITY: 'high',
      MAX_LAYERS: 10,
      AUDIO_BITRATE: '128k',
      AUDIO_ENABLED: true,
      STREAM_BITRATE: '6000k'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStreamConfig)
    });

    const response = await GET();
    const data = await response.json();

    expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/config', {
      headers: {
        'Accept': 'application/json',
      },
    });

    expect(data).toEqual({
      resolution: '1920x1080',
      targetFPS: 60,
      renderQuality: 'high',
      maxLayers: 10,
      audioBitrate: '128k',
      audioEnabled: true,
      streamBitrate: '6000k'
    });
  });

  it('should handle stream manager service errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const response = await GET();
    const data = await response.json();

    expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/config', {
      headers: {
        'Accept': 'application/json',
      },
    });

    expect(data).toEqual({
      error: 'Failed to fetch stream configuration'
    });
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    const response = await GET();
    const data = await response.json();

    expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/config', {
      headers: {
        'Accept': 'application/json',
      },
    });

    expect(data).toEqual({
      error: 'Failed to fetch stream configuration'
    });
  });

  it('should handle malformed response data', async () => {
    const malformedConfig = {
      unexpected: 'data',
      format: 'wrong'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(malformedConfig)
    });

    const response = await GET();
    const data = await response.json();

    expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/config', {
      headers: {
        'Accept': 'application/json',
      },
    });

    // Even with malformed data, we should get a properly structured response
    // with undefined values rather than throwing an error
    expect(data).toEqual({
      resolution: undefined,
      targetFPS: undefined,
      renderQuality: undefined,
      maxLayers: undefined,
      audioBitrate: undefined,
      audioEnabled: undefined,
      streamBitrate: undefined
    });
  });
}); 