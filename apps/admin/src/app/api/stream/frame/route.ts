import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker network URL
const STREAM_MANAGER_URL = 'http://stream-manager:4200';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${STREAM_MANAGER_URL}/demo/frame`, {
      headers: {
        'Accept': 'image/png',
        'User-Agent': 'admin-frontend'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Error proxying frame request:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch frame from stream manager' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 