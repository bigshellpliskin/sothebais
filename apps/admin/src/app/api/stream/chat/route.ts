import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[Chat API] Fetching chat history...');
    const response = await fetch('http://stream-manager:4200/chat/history', {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('[Chat API] Failed to fetch history:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to get chat history');
    }

    const history = await response.json();
    console.log('[Chat API] History received:', history);

    return NextResponse.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('[Chat API] Error serving history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get chat history' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const body = await request.json();

    // Handle chat highlight
    if (url.pathname.endsWith('/highlight')) {
      const { messageId, highlightType } = body;

      if (!messageId || !highlightType || typeof messageId !== 'string' || typeof highlightType !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Invalid highlight data' },
          { status: 400 }
        );
      }

      console.log('[Chat API] Highlighting message:', { messageId, highlightType });
      const response = await fetch('http://stream-manager:4200/chat/highlight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ messageId, highlightType })
      });

      if (!response.ok) {
        console.error('[Chat API] Failed to highlight message:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error('Failed to highlight message');
      }

      return NextResponse.json({ success: true });
    }

    // Handle regular chat message
    const { user, message } = body;

    if (!user || !message || typeof user !== 'string' || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid message data' },
        { status: 400 }
      );
    }

    console.log('[Chat API] Sending message:', { user, message });
    const response = await fetch('http://stream-manager:4200/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ user, message })
    });

    if (!response.ok) {
      console.error('[Chat API] Failed to send message:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to send message');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Chat API] Error handling request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 