import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[Stream Config API] Fetching configuration from stream manager...');
    // Fetch config from stream manager service
    const response = await fetch('http://stream-manager:4200/config', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Stream Config API] Failed to fetch config:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to fetch stream configuration');
    }

    const config = await response.json();
    console.log('[Stream Config API] Raw config from stream manager:', config);
    
    const formattedConfig = {
      resolution: config.STREAM_RESOLUTION,
      targetFPS: config.TARGET_FPS,
      renderQuality: config.RENDER_QUALITY,
      maxLayers: config.MAX_LAYERS,
      audioBitrate: config.AUDIO_BITRATE,
      audioEnabled: config.AUDIO_ENABLED,
      streamBitrate: config.STREAM_BITRATE
    };

    console.log('[Stream Config API] Formatted config being served:', formattedConfig);
    return NextResponse.json(formattedConfig);
  } catch (error) {
    console.error('[Stream Config API] Error serving configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stream configuration' },
      { status: 500 }
    );
  }
} 