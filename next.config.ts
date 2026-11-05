import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root. Without this Turbopack infers it from the nearest
  // lockfile it finds walking UP (a stray ~/package-lock.json on the dev Mac)
  // and then crashes trying to read directories above the project.
  turbopack: { root: __dirname },
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
  // The MLS Grid snapshot (data/mlsgrid-snapshot.json) is read at request time via
  // process.cwd(), which Next can't statically analyze — so on a serverless
  // host (Netlify) the function bundles wouldn't include it and listings would
  // come back EMPTY. Force the snapshot into every function's file trace.
  // (Listing photos live in /public/idx and are served as static CDN assets,
  // so they don't need tracing — only the JSON does.)
  // In production the site reads listings from Postgres (SUPABASE_ANON_KEY set,
  // see lib/idx/index.ts) and the snapshot — ~230 MB for the production scope —
  // must NOT be traced into every function bundle.
  outputFileTracingIncludes: process.env.SUPABASE_ANON_KEY
    ? {}
    : { '/**': ['./data/mlsgrid-snapshot.json'] },
};

export default nextConfig;
