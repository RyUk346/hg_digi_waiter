/**
 * Custom Next.js Image loader.
 *
 * The default /_next/image optimizer misresolves local file URLs when basePath
 * is set. Our app/api/img/[...path]/route.ts replaces it for uploaded files
 * and uses Sharp to resize + reencode to WebP / AVIF on the fly.
 *
 * External URLs pass through unchanged.
 */

interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

// Build-time inlined by Next (NEXT_PUBLIC_*).
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  // External — let the browser fetch directly. No optimization on our side.
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  const q = Math.min(100, Math.max(1, quality ?? 75));

  // Uploaded files → custom optimizer route
  if (src.startsWith('/uploads/')) {
    const rel = src.slice('/uploads/'.length);
    return `${BASE_PATH}/api/img/${rel}?w=${width}&q=${q}`;
  }

  // Any other local path — pass through (basePath auto-prefixed by Next)
  return src;
}
