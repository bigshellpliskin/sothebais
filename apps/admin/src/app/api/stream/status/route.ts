import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker network URL
const STREAM_MANAGER_URL = 'http://stream-manager:4200';

export async function GET(request: NextRequest) {
  try {
    const streamManagerUrl = `${STREAM_MANAGER_URL}/demo/status`;
    console.log('Fetching stream status from:', streamManagerUrl);

    const response = await fetch(streamManagerUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'admin-frontend'
      }
    });

    console.log('Stream manager response status:', response.status);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Stream manager error:', errorData);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Stream manager success response:', data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching stream status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stream status' },
      { status: 500 }
    );
  }
} 