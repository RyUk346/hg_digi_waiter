import { NextRequest, NextResponse } from 'next/server';
import { join, normalize, sep } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import sharp from 'sharp';

/**
 * Sharp-based image optimizer for uploaded files in /public/uploads/.
 *
 * Requested by the custom Image loader at src/lib/image-loader.ts.
 * URL shape: /api/img/<rest-of-path>?w=<width>&q=<quality>
 *
 * - Resizes to the requested width (preserves aspect ratio, no upscaling)
 * - Reencodes to AVIF / WebP / JPEG based on the browser's Accept header
 * - Long Cache-Control because (path + width + quality + format) uniquely
 *   identifies the response
 * - Path traversal-safe: must resolve under public/uploads
 */

export const runtime = 'nodejs';

const UPLOADS_ROOT = join(process.cwd(), 'public', 'uploads');
const MAX_WIDTH = 2400;
const ALLOWED_WIDTHS = [16, 32, 40, 48, 64, 96, 128, 160, 256, 320, 480, 640, 768, 1024, 1280, 1600, 1920, 2400];

function isAllowedWidth(w: number): boolean {
  return ALLOWED_WIDTHS.includes(w);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (!path || path.length === 0) {
    return new NextResponse('Path required', { status: 400 });
  }

  const wRaw = Number(req.nextUrl.searchParams.get('w') ?? '0');
  const w = Number.isFinite(wRaw) ? Math.floor(wRaw) : 0;
  if (w > 0 && !isAllowedWidth(w)) {
    return new NextResponse(`Width ${w} not allowed`, { status: 400 });
  }
  if (w > MAX_WIDTH) {
    return new NextResponse('Width too large', { status: 400 });
  }

  const qRaw = Number(req.nextUrl.searchParams.get('q') ?? '75');
  const q = Math.min(100, Math.max(1, Number.isFinite(qRaw) ? Math.floor(qRaw) : 75));

  // Build the on-disk path, then verify it stays inside UPLOADS_ROOT.
  const requested = normalize(join(UPLOADS_ROOT, ...path));
  if (!requested.startsWith(UPLOADS_ROOT + sep) && requested !== UPLOADS_ROOT) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  let raw: Buffer;
  let mtimeMs: number;
  try {
    const st = await stat(requested);
    if (!st.isFile()) throw new Error('not a file');
    mtimeMs = st.mtimeMs;
    raw = await readFile(requested);
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }

  const etag = `W/"${mtimeMs.toString(36)}-${raw.length.toString(36)}-${w}-${q}"`;
  if (req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  // Pick output format based on Accept header
  const accept = req.headers.get('accept') ?? '';
  const wantsAvif = accept.includes('image/avif');
  const wantsWebp = accept.includes('image/webp');

  let pipeline = sharp(raw, { failOn: 'none' });
  const meta = await pipeline.metadata();

  if (w > 0 && (meta.width ?? 0) > w) {
    pipeline = pipeline.resize({ width: w, withoutEnlargement: true });
  }

  let outBuf: Buffer;
  let contentType: string;
  try {
    if (wantsAvif) {
      outBuf = await pipeline.avif({ quality: q }).toBuffer();
      contentType = 'image/avif';
    } else if (wantsWebp) {
      outBuf = await pipeline.webp({ quality: q }).toBuffer();
      contentType = 'image/webp';
    } else {
      // Original format families — preserve PNG transparency if applicable
      if (meta.format === 'png' && meta.hasAlpha) {
        outBuf = await pipeline.png({ compressionLevel: 9 }).toBuffer();
        contentType = 'image/png';
      } else {
        outBuf = await pipeline.jpeg({ quality: q, mozjpeg: true }).toBuffer();
        contentType = 'image/jpeg';
      }
    }
  } catch (err) {
    console.error('[img] sharp pipeline failed', err);
    return new NextResponse('Optimization failed', { status: 500 });
  }

  return new NextResponse(outBuf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(outBuf.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
      Vary: 'Accept',
    },
  });
}
