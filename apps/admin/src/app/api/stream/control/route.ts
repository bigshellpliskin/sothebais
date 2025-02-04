import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[Stream Control API] Fetching layers from stream manager...');
    const response = await fetch('http://stream-manager:4200/layers', {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('[Stream Control API] Failed to fetch layers:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to get layers');
    }

    const layers = await response.json();
    console.log('[Stream Control API] Layers received:', layers);

    return NextResponse.json({
      success: true,
      data: layers
    });
  } catch (error) {
    console.error('[Stream Control API] Error serving layers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get layers' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, updates } = await request.json();
    if (!id || !updates || typeof id !== 'number' || typeof updates !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid layer update data' },
        { status: 400 }
      );
    }

    console.log('[Stream Control API] Updating layer:', { id, updates });
    const response = await fetch(`http://stream-manager:4200/layers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      console.error('[Stream Control API] Failed to update layer:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to update layer');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Stream Control API] Error updating layer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update layer' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { type } = await request.json();
    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid layer type' },
        { status: 400 }
      );
    }

    console.log('[Stream Control API] Toggling layer:', { type });
    const response = await fetch('http://stream-manager:4200/layers/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ type })
    });

    if (!response.ok) {
      console.error('[Stream Control API] Failed to toggle layer:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to toggle layer');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Stream Control API] Error toggling layer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle layer' },
      { status: 500 }
    );
  }
} 