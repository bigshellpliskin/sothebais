import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker network URL
const STREAM_MANAGER_URL = 'http://stream-manager:4200';

export async function GET(request: NextRequest) {
  try {
    console.log('[Frame API] Attempting to fetch frame from stream manager...');
    const response = await fetch(`${STREAM_MANAGER_URL}/stream/frame`, {
      headers: {
        'Accept': 'image/png',
        'User-Agent': 'admin-frontend'
      }
    });

    if (!response.ok) {
      console.error('[Frame API] Stream manager responded with error:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    console.log('[Frame API] Successfully fetched frame:', {
      size: blob.size,
      type: blob.type
    });
    
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('[Frame API] Error proxying frame request:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url: `${STREAM_MANAGER_URL}/stream/frame`,
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch frame from stream manager' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 