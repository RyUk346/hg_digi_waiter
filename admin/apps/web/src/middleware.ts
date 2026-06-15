import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/**
 * basePath-aware middleware.
 *
 * In Next.js with basePath set, `req.nextUrl.pathname` INCLUDES the basePath.
 * `NextResponse.redirect()` does NOT auto-prepend it. So we strip the basePath
 * when matching, and prepend it when constructing redirect URLs.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const PUBLIC_PREFIXES = ['/login', '/register', '/forgot', '/reset'];

// Anything under these prefixes bypasses auth entirely — static files,
// uploaded images, Next.js internals, Auth.js API routes, and the standalone
// KDS (which authenticates with a device token against the device-api, not
// an admin session).
const BYPASS_PREFIXES = ['/_next/', '/api/', '/uploads/', '/favicon.ico', '/robots.txt', '/kds'];

function stripBase(p: string): string {
  if (BASE_PATH && p.startsWith(BASE_PATH)) {
    const rest = p.slice(BASE_PATH.length);
    return rest.length > 0 ? rest : '/';
  }
  return p;
}

function withBase(p: string): string {
  return `${BASE_PATH}${p}`;
}

function isBypassPath(rel: string): boolean {
  return BYPASS_PREFIXES.some((p) => rel === p || rel.startsWith(p));
}

function isPublicPath(rel: string): boolean {
  return PUBLIC_PREFIXES.some((p) => rel === p || rel.startsWith(p + '/'));
}

export default auth((req) => {
  const fullPath = req.nextUrl.pathname;
  const relPath = stripBase(fullPath);

  // Short-circuit static assets and API routes — let them through untouched.
  // Done in code (not in matcher) so it's basePath-aware.
  if (isBypassPath(relPath)) return NextResponse.next();

  const isLoggedIn = !!req.auth;
  const isPublic = isPublicPath(relPath);

  if (isPublic) {
    if (isLoggedIn && relPath === '/login') {
      return NextResponse.redirect(new URL(withBase('/overview'), req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const url = new URL(withBase('/login'), req.nextUrl);
    url.searchParams.set('callbackUrl', fullPath);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  // Broad matcher — actual bypass logic lives in isBypassPath() above so it
  // can be basePath-aware. The matcher still excludes _next/static directly
  // so middleware doesn't even spin up for build chunks.
  matcher: ['/((?!_next/static|favicon.ico).*)'],
};
