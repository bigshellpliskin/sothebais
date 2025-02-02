import { NextRequest, NextResponse } from 'next/server';

const EVENT_HANDLER_URL = process.env.NODE_ENV === 'development' 
  ? 'http://event-handler:4300'  // Internal Docker network URL
  : `http://event-handler:4300`;  // Always use internal Docker network

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join('/');
    const url = `${EVENT_HANDLER_URL}/${path}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'admin-frontend'
      }
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error proxying request to event-handler:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from event handler' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join('/');
    const url = `${EVENT_HANDLER_URL}/${path}`;
    const body = await request.json();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'admin-frontend'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error proxying request to event-handler:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from event handler' },
      { status: 500 }
    );
  }
} 