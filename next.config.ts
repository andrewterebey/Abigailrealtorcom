import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Placeholder listing photos under /public/listings/ ship as SVG so they're
    // obviously fake. next/image refuses SVG by default; this opt-in is safe
    // because the SVGs are first-party static assets, not user uploads.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Listing photos are replicated into Supabase Storage (remote-media mode of
    // scripts/sync-idx.ts) and served from the project's public bucket.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // The MLS Grid snapshot (data/mlsgrid-demo.json) is read at request time via
  // process.cwd(), which Next can't statically analyze — so on a serverless
  // host (Netlify) the function bundles wouldn't include it and listings would
  // come back EMPTY. Force the snapshot into every function's file trace.
  // (Listing photos live in /public/idx and are served as static CDN assets,
  // so they don't need tracing — only the JSON does.)
  outputFileTracingIncludes: {
    '/**': ['./data/mlsgrid-demo.json'],
  },
};

export default nextConfig;
