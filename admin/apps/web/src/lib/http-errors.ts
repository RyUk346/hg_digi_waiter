import 'server-only';
import { redirect } from 'next/navigation';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * Lightweight wrappers around redirect() for permission failures.
 * Server Actions / pages call these; the redirect() flow surfaces the
 * right user-facing page (/login or /403) without ad-hoc URL strings.
 */

export function unauthorized(): never {
  redirect(`${BASE_PATH}/login`);
}

export function forbidden(_context?: Record<string, unknown>): never {
  // Context is intentionally consumed-but-unused — having it in the call
  // site documents what was required, even if we don't render it (a future
  // /403 page can read it from a search param).
  redirect(`${BASE_PATH}/403`);
}
