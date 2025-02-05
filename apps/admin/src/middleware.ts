import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";
import type { NextRequest } from 'next/server';

// Public and ignored routes
const publicRoutes = ["/"];
const ignoredRoutes = [
  "/api/health", 
  "/api/services/status", 
  "/api/services/metrics",
  "/api/stream/status",  // Allow stream status checks
  "/api/stream/frame",   // Allow frame fetching
  "/api/stream/config"   // Allow config fetching
];

// Create a custom middleware function that combines Clerk's middleware with our custom logic
const customMiddleware = async (req: NextRequest) => {
  const path = req.nextUrl.pathname;
  
  // Check for ignored routes first - these bypass Clerk completely
  if (ignoredRoutes.includes(path)) {
    return NextResponse.next();
  }

  // Run Clerk's middleware for all other routes
  const clerkResponse = await clerkMiddleware()(req as any, {} as any);
  
  // If Clerk's middleware returns a response, return it
  if (clerkResponse !== undefined) {
    return clerkResponse;
  }

  // For protected routes, check if user is authenticated
  if (!publicRoutes.includes(path)) {
    // Redirect to sign-in if not authenticated
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
};

export default customMiddleware;

export const config = {
  matcher: [
    // Match all paths except Next.js static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Always run for API routes
    '/api/:path*',
  ],
};
