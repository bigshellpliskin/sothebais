import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[Frame API] Fetching frame...');
    const response = await fetch('http://stream-manager:4200/frame', {
      headers: {
        'Accept': 'image/png'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('[Frame API] Failed to fetch frame:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to get frame buffer');
    }

    const blob = await response.blob();
    console.log('[Frame API] Frame received:', {
      size: blob.size,
      type: blob.type
    });

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'image/png'
      }
    });
  } catch (error) {
    console.error('[Frame API] Error serving frame:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get frame buffer' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    if (!url.pathname.endsWith('/config')) {
      return NextResponse.json(
        { success: false, error: 'Invalid endpoint' },
        { status: 404 }
      );
    }

    const config = await request.json();
    if (!config || typeof config !== 'object' ||
        !config.width || !config.height || !config.fps || !config.format ||
        typeof config.width !== 'number' ||
        typeof config.height !== 'number' ||
        typeof config.fps !== 'number' ||
        typeof config.format !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid frame configuration' },
        { status: 400 }
      );
    }

    console.log('[Frame API] Updating frame configuration:', config);
    const response = await fetch('http://stream-manager:4200/frame/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      console.error('[Frame API] Failed to update config:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to update frame configuration');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Frame API] Error updating frame config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update frame configuration' },
      { status: 500 }
    );
  }
} 