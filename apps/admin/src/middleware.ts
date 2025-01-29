import { authMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default authMiddleware({
  publicRoutes: ["/"],
  ignoredRoutes: ["/api/health", "/api/services/status"],
  afterAuth(auth, req) {
    // Additional custom logic can be added here if needed
    return NextResponse.next();
  }
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
