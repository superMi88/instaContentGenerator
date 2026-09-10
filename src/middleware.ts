import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

// Public endpoints that must be accessible without user login
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/cron',
  '/api/auth/instagram/callback',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Always allow Next.js static files and images
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp')
  ) {
    return NextResponse.next();
  }

  // 2. Allow Instagram Graph API scraper to fetch post slides without cookie
  // Format: /api/posts/[id]/assets/*
  if (/^\/api\/posts\/[^/]+\/assets(\/.*)?$/.test(pathname)) {
    return NextResponse.next();
  }

  // 3. Allow public auth APIs and cron
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 4. Verify user session
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  const isAuthenticated = Boolean(session);

  // 5. If user visits /login:
  if (pathname === '/login') {
    if (isAuthenticated) {
      // Already authenticated, redirect to studio home
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 6. If not authenticated:
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Nicht autorisiert. Bitte melde dich an.' },
        { status: 401 }
      );
    }

    // Redirect to login page preserving the original URL
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
