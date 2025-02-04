import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[Status API] Fetching stream status...');
    const response = await fetch('http://stream-manager:4200/status', {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('[Status API] Failed to fetch status:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to get stream status');
    }

    const status = await response.json();
    console.log('[Status API] Status received:', status);

    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[Status API] Error getting stream status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get stream status' },
      { status: 500 }
    );
  }
} 