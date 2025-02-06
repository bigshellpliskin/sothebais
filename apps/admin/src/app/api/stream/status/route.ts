import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const streamManagerUrl = process.env.STREAM_MANAGER_URL || 'http://stream-manager:4200';
    
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

    const rawData = await response.json();
    
    // Validate response structure
    if (!rawData || typeof rawData !== 'object') {
      console.error('[Status API] Invalid response format:', { rawData });
      throw new Error('Invalid response format from stream manager');
    }

    // Log the complete response structure
    console.log('[Status API] Raw response structure:', {
      hasData: 'data' in rawData,
      dataType: typeof rawData.data,
      fullStructure: JSON.stringify(rawData, null, 2)
    });

    // Extract and validate stream state
    const streamState = rawData.data;

    if (!streamState || typeof streamState !== 'object') {
      console.error('[Status API] Missing or invalid stream state:', { streamState });
      throw new Error('Invalid stream state format');
    }

    // Validate required fields
    if (typeof streamState.isLive !== 'boolean') {
      console.error('[Status API] Missing required field isLive:', { streamState });
      throw new Error('Missing required field: isLive');
    }

    // Return the validated stream state
    return NextResponse.json({
      success: true,
      data: streamState
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