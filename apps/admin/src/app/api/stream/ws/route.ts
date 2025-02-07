import { NextRequest } from 'next/server';
import { logger } from '@/utils/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  logger.info('WebSocket request received', {
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  try {
    // Forward to stream manager's WebSocket port
    const response = await fetch('http://stream-manager:4201', {
      method: 'GET',
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Key': req.headers.get('sec-websocket-key') || '',
        'Sec-WebSocket-Version': req.headers.get('sec-websocket-version') || '',
        'Sec-WebSocket-Protocol': req.headers.get('sec-websocket-protocol') || ''
      }
    });

    logger.info('WebSocket response received', {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    // Return upgrade response with the same headers we got
    return new Response(null, {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Accept': response.headers.get('sec-websocket-accept') || '',
        'Sec-WebSocket-Protocol': response.headers.get('sec-websocket-protocol') || ''
      }
    });
  } catch (error) {
    logger.error('WebSocket upgrade failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response('WebSocket upgrade failed', { status: 500 });
  }
} 