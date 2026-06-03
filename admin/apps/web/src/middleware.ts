import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const isAuthPage = path.startsWith('/login');

  if (isAuthPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL('/overview', req.nextUrl));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const url = new URL('/login', req.nextUrl);
    url.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
