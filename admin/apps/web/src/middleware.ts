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

function isPublicPath(rel: string): boolean {
  return PUBLIC_PREFIXES.some((p) => rel === p || rel.startsWith(p + '/'));
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const fullPath = req.nextUrl.pathname;
  const relPath = stripBase(fullPath);
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
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|uploads).*)'],
};
