import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import LivestreamPage from '../page';
import '@testing-library/jest-dom';

// Mock the StreamViewer component
jest.mock('@/components/stream-viewer', () => ({
  StreamViewer: ({ streamStatus }: { streamStatus: any }) => (
    <div data-testid="stream-viewer">
      <div>Status: {streamStatus.isLive ? 'Live' : 'Offline'}</div>
      <div>FPS: {streamStatus.fps}/{streamStatus.targetFPS}</div>
      <div>Layers: {streamStatus.layerCount}</div>
      <div>Latency: {streamStatus.averageRenderTime}ms</div>
    </div>
  )
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('LivestreamPage', () => {
  const mockInitialStatus = {
    success: true,
    isLive: false,
    isPaused: false,
    fps: 30,
    targetFPS: 60,
    layerCount: 4,
    averageRenderTime: 16.7,
    layers: {
      host: true,
      nft: false,
      overlay: true,
      chat: false
    }
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Mock initial status fetch for the page
    (global.fetch as jest.Mock)
      .mockImplementation((url) => {
        if (url === '/api/stream/status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockInitialStatus)
          });
        }
        // Default response for other URLs
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  // Helper function to wait for component updates
  const waitForComponentUpdate = async () => {
    await act(async () => {
      // Advance timers by a small amount
      jest.advanceTimersByTime(100);
      // Wait for all pending promises to settle
      await Promise.resolve();
      // Advance timers again to handle any new promises
      jest.advanceTimersByTime(100);
      // Final promise resolution
      await Promise.resolve();
    });
  };

  it('renders stream viewer and controls', async () => {
    // Render the component
    await act(async () => {
      render(<LivestreamPage />);
      // Wait for initial render
      await Promise.resolve();
    });

    // Wait for initial status fetch and updates
    await waitForComponentUpdate();

    // Check for main sections
    expect(screen.getByText('Stream Manager')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Playback')).toBeInTheDocument();
    expect(screen.getByText('Layer Controls')).toBeInTheDocument();
    
    // Check for chat section using role to be more specific
    expect(screen.getByRole('heading', { name: 'Chat' })).toBeInTheDocument();
    
    // Check for chat controls
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bid' })).toBeInTheDocument();
  });

  it('displays correct stream status', async () => {
    await act(async () => {
      render(<LivestreamPage />);
    });
    
    await waitForComponentUpdate();

    // Find the status section by its heading
    const statusSection = screen.getByRole('heading', { name: 'Status' }).closest('div');
    if (!statusSection) throw new Error('Status section not found');
    
    // Check individual status values using exact text matches
    expect(within(statusSection).getByText('Offline')).toBeInTheDocument();
    expect(within(statusSection).getByText('FPS: 0.0/30', { exact: true })).toBeInTheDocument();
    expect(within(statusSection).getByText('Layers: 0', { exact: true })).toBeInTheDocument();
    expect(within(statusSection).getByText('Latency: 0.0ms', { exact: true })).toBeInTheDocument();
  });

  it('handles stream control actions for all states', async () => {
    // Mock initial status
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              isLive: false,
              isPaused: false,
              fps: 0,
              targetFPS: 60,
              layerCount: 0,
              averageRenderTime: 0,
              layers: {
                host: false,
                nft: false,
                overlay: false,
                chat: false
              }
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    await act(async () => {
      render(<LivestreamPage />);
    });

    await waitForComponentUpdate();

    // Verify initial state
    const initialStreamViewer = screen.getByTestId('stream-viewer');
    expect(initialStreamViewer).toHaveTextContent('Status: Offline');

    // Test start action
    const playButton = screen.getByText('Play');
    await act(async () => {
      fireEvent.click(playButton);
      await waitForComponentUpdate();
    });

    // Verify start action was sent
    const startCalls = (global.fetch as jest.Mock).mock.calls
      .filter(call => call[0] === '/api/stream/control/playback');
    
    expect(startCalls[startCalls.length - 1][1]).toEqual({
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ action: 'start' })
    });

    // Mock stream as live after start
    let isLive = true;
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              isLive,
              isPaused: false,
              fps: 30,
              targetFPS: 60,
              layerCount: 4,
              averageRenderTime: 16.7,
              layers: {
                host: true,
                nft: false,
                overlay: true,
                chat: false
              }
            }
          })
        });
      }
      if (url === '/api/stream/control/playback') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    // Wait for multiple status updates to ensure state is reflected
    for (let i = 0; i < 3; i++) {
      jest.advanceTimersByTime(1000);
      await waitForComponentUpdate();
    }

    // Wait for UI to update and verify stream is live
    const streamViewer = screen.getByTestId('stream-viewer');
    expect(streamViewer).toHaveTextContent('Status: Live');

    // Clear previous fetch calls
    (global.fetch as jest.Mock).mockClear();

    // Test pause action
    const pauseButton = screen.getByText('Pause');
    expect(pauseButton).not.toBeDisabled();
    
    await act(async () => {
      fireEvent.click(pauseButton);
      await waitForComponentUpdate();
    });

    // Verify pause action was sent
    const pauseCalls = (global.fetch as jest.Mock).mock.calls
      .filter(call => call[0] === '/api/stream/control/playback');
    
    expect(pauseCalls.length).toBe(1);
    expect(pauseCalls[0][1]).toEqual({
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ action: 'pause' })
    });
  });

  it('handles stream control errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    await act(async () => {
      render(<LivestreamPage />);
    });

    await waitForComponentUpdate();

    expect(screen.getByText('Play')).toBeInTheDocument();

    // Mock failed control action
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/control/playback') {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    const playButton = screen.getByText('Play');
    await act(async () => {
      fireEvent.click(playButton);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Frontend] Error controlling stream:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('handles layer toggle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock failed layer update before rendering
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/control/layers/update') {
        return Promise.reject(new Error('Network error'));
      }
      if (url === '/api/stream/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockInitialStatus })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    render(<LivestreamPage />);
    
    // Wait for initial render and status fetch
    await waitFor(() => {
      expect(screen.getByText('Host')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Click the host button and verify error handling
    const hostButton = screen.getByText('Host');
    await act(async () => {
      fireEvent.click(hostButton);
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[Frontend] Error processing queue:',
          expect.any(Error)
        );
      }, { timeout: 1000 });
    });

    consoleSpy.mockRestore();
  });

  it('handles chat message errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    await act(async () => {
      render(<LivestreamPage />);
    });

    // Mock failed chat message send
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/chat') {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test message' } });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Frontend] Error sending message:',
      expect.any(Error)
    );

    // Message input should not be cleared on error
    expect(input).toHaveValue('Test message');

    consoleSpy.mockRestore();
  });

  it('handles multiple rapid layer toggles correctly', async () => {
    await act(async () => {
      render(<LivestreamPage />);
    });

    await waitForComponentUpdate();

    expect(screen.getByText('Host')).toBeInTheDocument();

    // Mock successful layer updates with delay
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/control/layers/update') {
        return new Promise(resolve => 
          setTimeout(() => 
            resolve({
              ok: true,
              json: () => Promise.resolve({ success: true })
            }), 100)
        );
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    // Click multiple layer buttons rapidly
    const hostButton = screen.getByText('Host');
    const nftButton = screen.getByText('Nft');
    const overlayButton = screen.getByText('Overlay');

    await act(async () => {
      fireEvent.click(hostButton);
      await waitForComponentUpdate();
      fireEvent.click(nftButton);
      await waitForComponentUpdate();
      fireEvent.click(overlayButton);
      await waitForComponentUpdate();
    });

    // Advance timers to process queue
    await waitForComponentUpdate();

    // Verify all updates were queued and processed
    const updateCalls = (global.fetch as jest.Mock).mock.calls
      .filter(call => call[0] === '/api/stream/control/layers/update');
    
    expect(updateCalls.length).toBe(3);
    expect(updateCalls[0][1].body).toContain('host');
    expect(updateCalls[1][1].body).toContain('nft');
    expect(updateCalls[2][1].body).toContain('overlay');
  });

  it('handles empty chat messages correctly', async () => {
    await act(async () => {
      render(<LivestreamPage />);
    });

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByText('Send');

    // Try to send empty message
    fireEvent.change(input, { target: { value: '' } });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    // Verify no API call was made
    expect(global.fetch).not.toHaveBeenCalledWith('/api/stream/chat', expect.any(Object));

    // Try to send whitespace-only message
    fireEvent.change(input, { target: { value: '   ' } });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    // Verify no API call was made
    expect(global.fetch).not.toHaveBeenCalledWith('/api/stream/chat', expect.any(Object));
  });

  it('handles layer toggling', async () => {
    await act(async () => {
      render(<LivestreamPage />);
    });

    await waitForComponentUpdate();

    expect(screen.getByText('Host')).toBeInTheDocument();

    // Mock successful layer update
    (global.fetch as jest.Mock)
      .mockImplementation((url) => {
        if (url === '/api/stream/status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: mockInitialStatus
            })
          });
        }
        if (url === '/api/stream/control/layers/update') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });

    const hostButton = screen.getByText('Host');
    await act(async () => {
      fireEvent.click(hostButton);
    });

    // Verify the update was sent
    expect(global.fetch).toHaveBeenCalledWith('/api/stream/control/layers/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        updates: [{ type: 'host', visible: true }]  // Toggle from false to true
      })
    });
  });

  it('handles chat message sending', async () => {
    await act(async () => {
      render(<LivestreamPage />);
    });

    // Mock successful chat message send
    (global.fetch as jest.Mock)
      .mockImplementation((url) => {
        if (url === '/api/stream/status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: mockInitialStatus
            })
          });
        }
        if (url === '/api/stream/chat') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Hello world' } });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/stream/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user: 'Admin',
        message: 'Hello world',
        highlighted: false 
      })
    });
  });

  it('handles bid message sending', async () => {
    await act(async () => {
      render(<LivestreamPage />);
    });

    // Mock successful bid message send
    (global.fetch as jest.Mock)
      .mockImplementation((url) => {
        if (url === '/api/stream/status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: mockInitialStatus
            })
          });
        }
        if (url === '/api/stream/chat') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });

    const input = screen.getByPlaceholderText('Type a message...');
    const bidButton = screen.getByText('Bid');

    fireEvent.change(input, { target: { value: 'Bid message' } });
    await act(async () => {
      fireEvent.click(bidButton);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/stream/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user: 'Admin',
        message: 'Bid message',
        highlighted: true 
      })
    });
  });

  it('polls for status updates', async () => {
    await act(async () => {
      render(<LivestreamPage />);
    });

    await waitForComponentUpdate();

    const streamViewer = screen.getByTestId('stream-viewer');
    expect(streamViewer).toHaveTextContent('Status: Offline');

    // Mock next status update
    const updatedStatus = {
      success: true,
      data: {
        isLive: true,
        isPaused: false,
        fps: 59,
        targetFPS: 60,
        layerCount: 4,
        averageRenderTime: 15.5,
        layers: {
          host: true,
          nft: true,
          overlay: true,
          chat: true
        }
      }
    };

    // Update the mock to return the new status
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(updatedStatus)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    // Advance timers to trigger next poll
    jest.advanceTimersByTime(1000);
    await waitForComponentUpdate();

    // Verify status was updated
    expect(streamViewer).toHaveTextContent('Status: Live');
    expect(streamViewer).toHaveTextContent('FPS: 59/60');
    expect(streamViewer).toHaveTextContent('Latency: 15.5ms');
  });

  it('handles status polling errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock initial status with data field
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              isLive: false,
              isPaused: false,
              fps: 0,
              targetFPS: 30,
              layerCount: 0,
              averageRenderTime: 0,
              layers: {
                host: false,
                nft: false,
                overlay: false,
                chat: false
              }
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    await act(async () => {
      render(<LivestreamPage />);
    });

    await waitForComponentUpdate();

    expect(screen.getByTestId('stream-viewer')).toHaveTextContent('Status: Offline');

    // Mock failed status update
    const networkError = new Error('Network error');
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/status') {
        return Promise.reject(networkError);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    // Advance timers to trigger next poll
    jest.advanceTimersByTime(1000);
    await waitForComponentUpdate();

    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Frontend] Error fetching status:',
      networkError
    );

    // Verify the UI still shows the last known status
    const streamViewer = screen.getByTestId('stream-viewer');
    expect(streamViewer).toHaveTextContent('Status: Offline');
    expect(streamViewer).toHaveTextContent('FPS: 0/30');
    expect(streamViewer).toHaveTextContent('Latency: 0ms');

    consoleSpy.mockRestore();
  });

  it('queues layer updates and processes them in order', async () => {
    await act(async () => {
      render(<LivestreamPage />);
    });

    await waitForComponentUpdate();

    expect(screen.getByText('Host')).toBeInTheDocument();

    // Mock successful layer updates
    (global.fetch as jest.Mock)
      .mockImplementation((url) => {
        if (url === '/api/stream/status') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              isLive: false,
              isPaused: false,
              fps: 30,
              targetFPS: 60,
              layerCount: 4,
              averageRenderTime: 16.7,
              layers: {
                host: false,
                nft: false,
                overlay: false,
                chat: false
              }
            })
          });
        }
        if (url === '/api/stream/control/layers/update') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });

    // Click multiple layer buttons quickly
    const hostButton = screen.getByText('Host');
    const nftButton = screen.getByText('Nft');
    const overlayButton = screen.getByText('Overlay');

    await act(async () => {
      fireEvent.click(hostButton);
      await waitForComponentUpdate();
      fireEvent.click(nftButton);
      await waitForComponentUpdate();
      fireEvent.click(overlayButton);
      await waitForComponentUpdate();
    });

    // Verify the updates were sent individually
    const layerUpdateCalls = (global.fetch as jest.Mock).mock.calls
      .filter(call => call[0] === '/api/stream/control/layers/update');
    
    expect(layerUpdateCalls.length).toBe(3);
    
    // Each call should update one layer
    expect(JSON.parse(layerUpdateCalls[0][1].body)).toEqual({
      updates: [{ type: 'host', visible: true }]
    });
    expect(JSON.parse(layerUpdateCalls[1][1].body)).toEqual({
      updates: [{ type: 'nft', visible: true }]
    });
    expect(JSON.parse(layerUpdateCalls[2][1].body)).toEqual({
      updates: [{ type: 'overlay', visible: true }]
    });
  });

  it('handles non-200 responses correctly', async () => {
    await act(async () => {
      render(<LivestreamPage />);
    });

    // Mock failed status response
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/status') {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    // Advance timers to trigger status polling
    await waitForComponentUpdate();

    // Verify the UI shows default/fallback values
    expect(screen.getByText('Status: Offline')).toBeInTheDocument();
    expect(screen.getByText('FPS: 0/30')).toBeInTheDocument();
    expect(screen.getByText('Latency: 0.0ms')).toBeInTheDocument();
  });

  it('handles malformed server responses correctly', async () => {
    await act(async () => {
      render(<LivestreamPage />);
    });

    // Mock malformed status response
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: null  // Missing data
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    // Advance timers to trigger status polling
    await waitForComponentUpdate();

    // Verify the UI shows default/fallback values
    expect(screen.getByText('Status: Offline')).toBeInTheDocument();
    expect(screen.getByText('FPS: 0/30')).toBeInTheDocument();
    expect(screen.getByText('Latency: 0.0ms')).toBeInTheDocument();
  });

  it('handles rapid status polling correctly', async () => {
    await act(async () => {
      render(<LivestreamPage />);
    });

    // Track status updates to simulate realistic state transitions
    const statusUpdates = [
      { fps: 30, targetFPS: 60 },  // Initial ramp up
      { fps: 45, targetFPS: 60 },  // Increasing
      { fps: 50, targetFPS: 60 },  // Target state we want to verify
      { fps: 55, targetFPS: 60 },  // Continue increasing
      { fps: 60, targetFPS: 60 }   // Final state
    ];
    
    let currentUpdateIndex = 0;
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/status') {
        const currentStatus = statusUpdates[currentUpdateIndex];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              isLive: true,
              isPaused: false,
              fps: currentStatus.fps,
              targetFPS: currentStatus.targetFPS,
              layerCount: 4,
              averageRenderTime: 16.7,
              layers: {
                host: true,
                nft: false,
                overlay: true,
                chat: false
              }
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    // Wait for initial render and first status update
    await waitForComponentUpdate();
    jest.advanceTimersByTime(1000);
    await waitForComponentUpdate();

    // Advance through status updates
    for (let i = 0; i < statusUpdates.length; i++) {
      currentUpdateIndex = i;
      jest.advanceTimersByTime(1000);
      await waitForComponentUpdate();

      // Verify the specific state we care about
      if (statusUpdates[i].fps === 50) {
        const streamViewer = screen.getByTestId('stream-viewer');
        expect(streamViewer).toHaveTextContent('FPS: 50/60');
      }
    }

    // Verify final state
    const streamViewer = screen.getByTestId('stream-viewer');
    expect(streamViewer).toHaveTextContent('FPS: 60/60');
  });

  it('handles concurrent layer updates correctly', async () => {
    await act(async () => {
      render(<LivestreamPage />);
    });

    await waitForComponentUpdate();

    expect(screen.getByText('Host')).toBeInTheDocument();

    let updateCount = 0;
    const pendingUpdates: Promise<any>[] = [];

    // Mock layer updates with varying delays
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/control/layers/update') {
        updateCount++;
        const delay = Math.random() * 100;  // Random delay between 0-100ms
        const promise = new Promise(resolve => 
          setTimeout(() => 
            resolve({
              ok: true,
              json: () => Promise.resolve({ success: true })
            }), delay)
        );
        pendingUpdates.push(promise);
        return promise;
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    // Click all layer buttons concurrently
    const hostButton = screen.getByText('Host');
    const nftButton = screen.getByText('Nft');
    const overlayButton = screen.getByText('Overlay');
    const chatButton = screen.getByRole('button', { name: 'Chat' });

    await act(async () => {
      fireEvent.click(hostButton);
      await waitForComponentUpdate();
      fireEvent.click(nftButton);
      await waitForComponentUpdate();
      fireEvent.click(overlayButton);
      await waitForComponentUpdate();
      fireEvent.click(chatButton);
      await waitForComponentUpdate();
    });

    // Wait for all updates to complete
    await waitForComponentUpdate();

    // Verify all updates were processed
    const updateCalls = (global.fetch as jest.Mock).mock.calls
      .filter(call => call[0] === '/api/stream/control/layers/update');
    
    expect(updateCalls.length).toBe(4);
    expect(updateCalls.map(call => JSON.parse(call[1].body).updates[0].type))
      .toEqual(expect.arrayContaining(['host', 'nft', 'overlay', 'chat']));
  });

  it('handles layer updates during stream state changes', async () => {
    await act(async () => {
      render(<LivestreamPage />);
    });

    await waitForComponentUpdate();

    expect(screen.getByText('Host')).toBeInTheDocument();

    // Mock stream control and layer updates
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/stream/control/playback') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      if (url === '/api/stream/control/layers/update') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      if (url === '/api/stream/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              ...mockInitialStatus,
              isLive: true
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    // Start the stream
    const playButton = screen.getByText('Play');
    await act(async () => {
      fireEvent.click(playButton);
    });

    // Toggle layers while stream is starting
    const hostButton = screen.getByText('Host');
    const nftButton = screen.getByText('Nft');
    const overlayButton = screen.getByText('Overlay');

    await act(async () => {
      fireEvent.click(hostButton);
      await waitForComponentUpdate();
      fireEvent.click(nftButton);
      await waitForComponentUpdate();
      fireEvent.click(overlayButton);
      await waitForComponentUpdate();
    });

    // Verify layer updates were processed
    const updateCalls = (global.fetch as jest.Mock).mock.calls
      .filter(call => call[0] === '/api/stream/control/layers/update');
    
    expect(updateCalls.length).toBe(3);
    expect(updateCalls[0][1].body).toContain('host');
    expect(updateCalls[1][1].body).toContain('nft');
    expect(updateCalls[2][1].body).toContain('overlay');
  });
}); 