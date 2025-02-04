import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker network URL
const STREAM_MANAGER_URL = 'http://stream-manager:4200';

export async function GET(request: NextRequest) {
  console.log('[Layer Control] Fetching all layer states');
  try {
    const streamManagerUrl = `${STREAM_MANAGER_URL}/stream/layers`;
    console.log('[Layer Control] Requesting from:', streamManagerUrl);

    const response = await fetch(streamManagerUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'admin-frontend'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Layer Control] Error fetching layers:', errorData);
      return NextResponse.json(
        { 
          success: false,
          error: errorData.message || 'Failed to fetch layer states'
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Layer Control] Success response:', data);
    
    return NextResponse.json({
      success: true,
      data: {
        layers: data.layers,
        count: data.count
      }
    });
  } catch (error) {
    console.error('[Layer Control] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch layer states',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 