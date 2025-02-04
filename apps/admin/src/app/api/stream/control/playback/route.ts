import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker network URL
const STREAM_MANAGER_URL = 'http://stream-manager:4200';

export async function POST(request: NextRequest) {
  // Log full request details
  console.log('[Stream Control] Full request details:', {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString()
  });

  try {
    const body = await request.json();
    const { action } = body;

    console.log('[Stream Control] Request body:', body);

    if (!action || !['start', 'stop', 'pause'].includes(action)) {
      console.log('[Stream Control] Invalid action:', action);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid action. Must be one of: start, stop, pause'
        },
        { status: 400 }
      );
    }

    const streamManagerUrl = `${STREAM_MANAGER_URL}/stream/control`;
    console.log('[Stream Control] Sending request to:', streamManagerUrl);

    const response = await fetch(streamManagerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'admin-frontend'
      },
      body: JSON.stringify({ action })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Stream Control] Error response text:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: 'Failed to parse error response' };
      }
      console.error('[Stream Control] Error data:', errorData);
      return NextResponse.json(
        { 
          success: false,
          error: errorData.message || 'Failed to control stream'
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Stream Control] Success response:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Stream Control] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to control stream',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 