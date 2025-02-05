import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const streamManagerUrl = process.env.STREAM_MANAGER_URL || 'http://stream-manager:4200';
    console.log('[Status API] Fetching stream status from:', streamManagerUrl);
    
    const response = await fetch(`${streamManagerUrl}/stream/status`, {
      headers: {
        'Accept': 'application/json'
      }
    }).catch(error => {
      console.error('[Status API] Network error:', error.message);
      throw new Error(`Failed to connect to stream manager: ${error.message}`);
    });

    if (!response.ok) {
      console.error('[Status API] Failed to fetch status:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`Stream manager returned ${response.status}: ${response.statusText}`);
    }

    const status = await response.json();
    console.log('[Status API] Status received:', status);

    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[Status API] Error getting stream status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get stream status',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
} 