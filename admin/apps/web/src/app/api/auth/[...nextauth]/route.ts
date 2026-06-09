import { NextRequest } from 'next/server';
import { handlers } from '@/auth';

/**
 * Auth.js v5 + Next.js basePath workaround.
 *
 * Auth.js parses the incoming URL against its own basePath (which is set from
 * AUTH_URL). Next.js with `basePath` strips its prefix from `req.nextUrl.pathname`
 * before route handlers run, so Auth.js sees a URL without the basePath and
 * throws `UnknownAction: Cannot parse action at /api/auth/callback/google`.
 *
 * Fix: re-inject the Next.js basePath into the URL before delegating to Auth.js.
 * Locally (no basePath), this is a no-op.
 *
 * Tracked upstream — see https://github.com/nextauthjs/next-auth/issues
 * (search "basePath UnknownAction").
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

function withBasePath(req: NextRequest): NextRequest {
  if (!BASE_PATH) return req;
  if (req.nextUrl.pathname.startsWith(BASE_PATH)) return req;

  const url = new URL(
    BASE_PATH + req.nextUrl.pathname + req.nextUrl.search,
    req.nextUrl.origin,
  );
  return new NextRequest(url, req);
}

export async function GET(req: NextRequest) {
  return handlers.GET(withBasePath(req));
}

export async function POST(req: NextRequest) {
  return handlers.POST(withBasePath(req));
}
