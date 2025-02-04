import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker network URL
const STREAM_MANAGER_URL = 'http://stream-manager:4200';

interface LayerUpdate {
  type: string;
  visible: boolean;
}

export async function POST(request: NextRequest) {
  console.log('[Layer Control] Request received:', {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString()
  });

  try {
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      console.error('[Layer Control] Invalid updates:', updates);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid updates format'
        },
        { status: 400 }
      );
    }

    console.log('[Layer Control] Processing updates:', updates);

    // Process each update sequentially
    const results = await Promise.all(updates.map(async (update: LayerUpdate) => {
      const response = await fetch(`${STREAM_MANAGER_URL}/stream/toggle/${update.type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'admin-frontend'
        },
        body: JSON.stringify({ visible: update.visible })
      });

      if (!response.ok) {
        console.error(`[Layer Control] Failed to update layer ${update.type}:`, {
          status: response.status,
          statusText: response.statusText
        });
        return {
          type: update.type,
          success: false,
          error: `Failed to update layer ${update.type}`
        };
      }

      const data = await response.json();
      return {
        type: update.type,
        success: true,
        data
      };
    }));

    // Get final layer count
    const countResponse = await fetch(`${STREAM_MANAGER_URL}/stream/layers`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'admin-frontend'
      }
    });

    let layerCount = undefined;
    if (countResponse.ok) {
      const countData = await countResponse.json();
      layerCount = countData.count;
    }

    console.log('[Layer Control] Batch update results:', results);
    
    return NextResponse.json({
      success: true,
      data: {
        results,
        layerCount
      }
    });
  } catch (error) {
    console.error('[Layer Control] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update layers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 