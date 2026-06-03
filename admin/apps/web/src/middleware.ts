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

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const fullPath = req.nextUrl.pathname;
  const relPath = stripBase(fullPath);
  const isAuthPage = relPath.startsWith('/login');

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(withBase('/overview'), req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const url = new URL(withBase('/login'), req.nextUrl);
    // callbackUrl is what the user originally requested — use the full path
    // (basePath included) so signIn returns them to the right place.
    url.searchParams.set('callbackUrl', fullPath);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
