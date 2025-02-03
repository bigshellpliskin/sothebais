import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker network URL
const STREAM_MANAGER_URL = 'http://stream-manager:4200';

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const response = await fetch(`${STREAM_MANAGER_URL}/demo/toggle/${params.type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'admin-frontend'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying toggle request:', error);
    return NextResponse.json(
      { error: 'Failed to toggle layer' },
      { status: 500 }
    );
  }
} 