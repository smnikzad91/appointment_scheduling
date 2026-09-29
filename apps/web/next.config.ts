import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` refuses its own /_next resources (HMR, lazily loaded chunks such as the Leaflet
  // map) to any host but localhost; this lets the dev server be used via its IP. Dev-only.
  allowedDevOrigins: ["127.0.0.1", "91.107.143.45"],
  // Photos uploaded after `next start` aren't served from public/ — fall back to reading them from
  // disk (plain array = afterFiles: only used when no public file matched).
  async rewrites() {
    return [
      // Expense receipts are private (stored outside public/, see lib/privateUploads.ts): only
      // their owner may read them. Listed first so the public route below never serves them.
      { source: "/uploads/expenses/:file", destination: "/api/receipts/expenses/:file" },
      { source: "/uploads/salon-expenses/:file", destination: "/api/receipts/salon-expenses/:file" },
      { source: "/uploads/:path*", destination: "/api/public/uploads/:path*" },
    ];
  },
  // The service worker must never be cached by the browser/CDN, or updates to it get stuck.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
    
    turbopack: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  
};

export default nextConfig;
