import { NextRequest, NextResponse } from 'next/server';

// Use internal Docker network URL
const STREAM_MANAGER_URL = 'http://stream-manager:4200';

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  console.log('API route received request for type:', params.type);
  try {
    const body = await request.json();
    console.log('Request body:', body);

    const streamManagerUrl = `${STREAM_MANAGER_URL}/stream/toggle/${params.type}`;
    console.log('Forwarding request to stream manager:', streamManagerUrl);

    const response = await fetch(streamManagerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'admin-frontend'
      },
      body: JSON.stringify(body)
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
    console.error('Error proxying toggle request:', error);
    return NextResponse.json(
      { error: 'Failed to toggle layer' },
      { status: 500 }
    );
  }
} 