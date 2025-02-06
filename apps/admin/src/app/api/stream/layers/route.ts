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
      console.error('[Layer Control] Error fetching layers:', {
        status: response.status,
        statusText: response.statusText,
        data,
        rawResponse: responseText
      });
      return NextResponse.json(
        { 
          success: false,
          error: data.error || 'Failed to fetch layer states',
          details: data.details || responseText
        },
        { status: response.status }
      );
    }

    console.log('[Layer Control] Success response:', data);
    
    // Handle the stream manager's response structure
    return NextResponse.json({
      success: true,
      data: data.data,
      count: data.count || (Array.isArray(data.data) ? data.data.length : 0)
    });
  } catch (error) {
    console.error('[Layer Control] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch layer states',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 