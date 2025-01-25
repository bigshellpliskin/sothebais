import { NextResponse } from "next/server";
import { register, collectDefaultMetrics } from 'prom-client';

// Initialize metrics collection
collectDefaultMetrics({
  prefix: 'admin_frontend_'
});

export async function GET() {
  try {
    // Set the content type header
    const metrics = await register.metrics();
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': register.contentType
      }
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    return new NextResponse('Error generating metrics', { status: 500 });
  }
} 