import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker network URL
const STREAM_MANAGER_URL = 'http://stream-manager:4200';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Layer Control] Visibility update request:', {
    layerId: params.id,
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString()
  });

  try {
    const body = await request.json();
    const { visible } = body;

    if (typeof visible !== 'boolean') {
      console.error('[Layer Control] Invalid visibility value:', visible);
      return NextResponse.json(
        { 
          success: false,
          error: 'Visibility must be a boolean'
        },
        { status: 400 }
      );
    }

    // Forward the request to the stream manager
    const response = await fetch(`${STREAM_MANAGER_URL}/stream/layers/${params.id}/visibility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'admin-frontend'
      },
      body: JSON.stringify({ visible })
    });

    // First try to get the response as text to handle potential HTML errors
    const responseText = await response.text();
    console.log('[Layer Control] Raw response from stream manager:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[Layer Control] Failed to parse response:', {
        text: responseText,
        error: e instanceof Error ? e.message : 'Unknown parsing error'
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid response from stream manager',
          details: `Failed to parse JSON response. Raw response: ${responseText}`
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('[Layer Control] Error updating layer visibility:', {
        status: response.status,
        statusText: response.statusText,
        data,
        rawResponse: responseText
      });
      return NextResponse.json(
        { 
          success: false,
          error: data.error || 'Failed to update layer visibility',
          details: data.details || responseText
        },
        { status: response.status }
      );
    }

    console.log('[Layer Control] Success response:', data);
    
    return NextResponse.json({
      success: true,
      data: data.data
    });
  } catch (error) {
    console.error('[Layer Control] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update layer visibility',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 