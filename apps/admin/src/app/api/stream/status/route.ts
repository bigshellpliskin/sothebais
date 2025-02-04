import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker network URL
const STREAM_MANAGER_URL = 'http://stream-manager:4200';

// This is a Next.js API route handler for GET requests
export async function GET(request: NextRequest) {
  // Log request details
  console.log('[API Status] Request received:', {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString()
  });
  
  try {
    const streamManagerUrl = `${STREAM_MANAGER_URL}/stream/status`;
    console.log('[API Status] Fetching from:', streamManagerUrl);

    const response = await fetch(streamManagerUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'admin-frontend'
      }
    });

    console.log('[API Status] Response status:', response.status);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[API Status] Error:', errorData);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Log the raw response data
    console.log('[API Status] Raw response:', JSON.stringify(data, null, 2));
    
    // Log the specific values we care about
    console.log('[API Status] Values:', {
      fps: data.fps,
      targetFPS: data.targetFPS,
      isLive: data.isLive,
      layerCount: data.layerCount,
      averageRenderTime: data.averageRenderTime
    });
    
    // Set CORS headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
    
    // Pass through the data without modification
    return NextResponse.json(data, { headers });
  } catch (error) {
    console.error('[API Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stream status' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  }
} 