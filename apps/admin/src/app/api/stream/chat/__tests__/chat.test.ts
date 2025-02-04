import { mockChatMessage, createTestRequest } from '../../../__tests__/setup';
import { GET, POST } from '../route';

describe('Chat API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /chat', () => {
    it('should return chat history', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockChatMessage])
      });

      const response = await GET();
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/chat/history', {
        headers: {
          'Accept': 'application/json'
        }
      });
      expect(data).toEqual({
        success: true,
        data: [mockChatMessage]
      });
    });

    it('should handle errors when getting history', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const response = await GET();
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/chat/history', {
        headers: {
          'Accept': 'application/json'
        }
      });
      expect(data).toEqual({
        success: false,
        error: 'Failed to get chat history'
      });
    });
  });

  describe('POST /chat', () => {
    const mockUrl = 'http://localhost:3000/api/stream/chat';

    it('should send a chat message', async () => {
      const message = {
        user: 'testUser',
        message: 'Hello world'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const request = createTestRequest({
        method: 'POST',
        url: mockUrl,
        body: message
      });
      const response = await POST(request);
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(message)
      });
      expect(data).toEqual({
        success: true
      });
    });

    it('should handle invalid message data', async () => {
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
        error: 'Invalid message data'
      });
    });
  });

  describe('POST /chat/highlight', () => {
    const mockUrl = 'http://localhost:3000/api/stream/chat/highlight';

    it('should highlight a message', async () => {
      const highlightData = {
        messageId: '123',
        highlightType: 'bid'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const request = createTestRequest({
        method: 'POST',
        url: mockUrl,
        body: highlightData
      });
      const response = await POST(request);
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith('http://stream-manager:4200/chat/highlight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(highlightData)
      });
      expect(data).toEqual({
        success: true
      });
    });

    it('should handle invalid highlight data', async () => {
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
        error: 'Invalid highlight data'
      });
    });
  });
}); 