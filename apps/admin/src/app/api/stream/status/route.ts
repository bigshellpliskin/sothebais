import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🔵 [Status API] Route handler called');
  
  try {
    const streamManagerUrl = process.env['STREAM_MANAGER_URL'] || 'http://stream-manager:4200';
    console.log('🔵 [Status API] Fetching from:', streamManagerUrl + '/stream/status');
    
    const response = await fetch(`${streamManagerUrl}/stream/status`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-store'
      }
    }).catch(error => {
      console.error('🔴 [Status API] Network error:', error.message);
      throw new Error(`Failed to connect to stream manager: ${error.message}`);
    });

    if (!response.ok) {
      console.error('🔴 [Status API] Failed response:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`Stream manager returned ${response.status}: ${response.statusText}`);
    }

    const rawText = await response.text();
    console.log('🔵 [Status API] Raw response text:', rawText);

    const rawData = JSON.parse(rawText);
    console.log('🔵 [Status API] Parsed backend response:', {
      rawData,
      hasSuccess: 'success' in rawData,
      hasData: 'data' in rawData,
      dataType: typeof rawData.data
    });
    
    // Validate the response structure
    if (!rawData?.success || !rawData?.data) {
      console.error('🔴 [Status API] Invalid response format:', { rawData });
      throw new Error('Invalid response format from stream manager');
    }

    // Get the stream state
    const streamState = rawData.data;
    console.log('🔵 [Status API] Stream state from backend:', {
      state: streamState,
      isLiveType: typeof streamState.isLive,
      isLiveValue: streamState.isLive
    });

    if (!streamState || typeof streamState !== 'object') {
      console.error('🔴 [Status API] Invalid state:', { rawData });
      throw new Error('Invalid stream state format');
    }

    // Create response with explicit type checking
    const response_data = {
      success: true,
      data: {
        isLive: Boolean(streamState.isLive),
        isPaused: Boolean(streamState.isPaused),
        fps: Number(streamState.fps) || 0,
        targetFPS: Number(streamState.targetFPS) || 30,
        frameCount: Number(streamState.frameCount) || 0,
        droppedFrames: Number(streamState.droppedFrames) || 0,
        averageRenderTime: Number(streamState.averageRenderTime) || 0,
        startTime: streamState.startTime || null,
        error: streamState.error || null
      }
    };

    console.log('🔵 [Status API] Sending to frontend:', response_data);
    
    return NextResponse.json(response_data);
  } catch (error) {
    console.error('🔴 [Status API] Error:', error);
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