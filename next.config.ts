import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Placeholder listing photos under /public/listings/ ship as SVG so they're
    // obviously fake. next/image refuses SVG by default; this opt-in is safe
    // because the SVGs are first-party static assets, not user uploads.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
