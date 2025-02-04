import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker network URL
const STREAM_MANAGER_URL = 'http://stream-manager:4200';

interface LayerUpdate {
  type: string;
  visible: boolean;
}

export async function POST(request: NextRequest) {
  console.log('[Layer Control] Batch update request received');
  try {
    const body = await request.json();
    const updates: LayerUpdate[] = body.updates;

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request body. Expected array of layer updates.'
        },
        { status: 400 }
      );
    }

    console.log('[Layer Control] Processing updates:', updates);

    // Process all updates in parallel
    const results = await Promise.all(
      updates.map(async ({ type, visible }) => {
        const streamManagerUrl = `${STREAM_MANAGER_URL}/stream/toggle/${type}`;
        const response = await fetch(streamManagerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'admin-frontend'
          },
          body: JSON.stringify({ visible })
        });

        if (!response.ok) {
          const errorData = await response.json();
          return {
            type,
            success: false,
            error: errorData.message || 'Failed to update layer'
          };
        }

        const data = await response.json();
        return {
          type,
          success: true,
          actualState: data.layer.actualState
        };
      })
    );

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