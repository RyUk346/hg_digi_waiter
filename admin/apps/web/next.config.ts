import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sub-path deployment. Set via env so local dev (no base path) and prod
  // (under /SoftPOS/Test) can coexist with no code changes.
  // Local: leave NEXT_PUBLIC_BASE_PATH unset → basePath = '' → serves at /
  // Prod:  NEXT_PUBLIC_BASE_PATH=/SoftPOS/Test → serves under that prefix
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  images: {
    // Custom Sharp-based optimizer at /api/img/<path>. Bypasses Next's
    // built-in /_next/image which doesn't play nicely with basePath
    // for local files.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },
  // @hyperglow/db is a workspace package shipped as TS source; tell Next to compile it.
  transpilePackages: ['@hyperglow/db'],
  experimental: {
    typedRoutes: true,
    serverActions: {
      // Menu item image uploads — bumped from the 1MB default.
      bodySizeLimit: '5mb',
    },
  },
  serverExternalPackages: ['postgres'],
};

export default nextConfig;
