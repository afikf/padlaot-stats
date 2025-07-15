import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that require authentication
const PROTECTED_PATHS = ['/dashboard', '/select-player'];

// Paths that should skip middleware
const PUBLIC_PATHS = ['/login', '/api', '/_next', '/static', '/favicon.ico'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if path requires auth
  const isProtectedPath = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // Check for auth token
  const idToken = request.cookies.get('idToken')?.value;

  // If no token and on a protected path, redirect to login
  if (!idToken) {
    console.log('Middleware: No token found, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 