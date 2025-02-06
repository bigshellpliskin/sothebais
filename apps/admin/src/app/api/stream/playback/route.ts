import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker network URL
const STREAM_MANAGER_URL = 'http://stream-manager:4200';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action || !['start', 'stop', 'pause'].includes(action)) {
      console.error('[Stream Control] Invalid action:', action);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid action. Must be one of: start, stop, pause'
        },
        { status: 400 }
      );
    }

    console.log('[Stream Control] Sending action:', action);
    const streamManagerUrl = `${STREAM_MANAGER_URL}/stream/${action}`;

    const response = await fetch(streamManagerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'admin-frontend'
      },
      // Add a timeout to prevent hanging requests
      signal: AbortSignal.timeout(5000)
    });

    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[Stream Control] Failed to parse response:', responseText);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid response from stream manager',
          details: responseText
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error('[Stream Control] Stream manager error:', {
        status: response.status,
        data
      });
      return NextResponse.json(
        { 
          success: false,
          error: data.error || 'Failed to control stream',
          details: data
        },
        { status: response.status }
      );
    }

    console.log('[Stream Control] Action completed successfully:', {
      action,
      response: data
    });
    
    return NextResponse.json({ 
      success: true, 
      data: data.data || data 
    });
  } catch (error) {
    console.error('[Stream Control] Unexpected error:', error);
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