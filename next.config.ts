import type { NextConfig } from "next";

const development = process.env.NODE_ENV === "development";
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'" +
        (development ? " 'unsafe-eval'" : ""),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'" + (development ? " ws: wss:" : ""),
      "worker-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const config: NextConfig = {
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  experimental: { serverActions: { bodySizeLimit: "64kb" } },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders.slice(1) },
      {
        source: "/:path((?!staff(?:/|$)).*)",
        headers: securityHeaders.slice(0, 1),
      },
      {
        source: "/demo/offline",
        headers: [{ key: "X-Rose-Offline-Shell", value: "public-demo-v3" }],
      },
      {
        source: "/:worker(sw\\.js|demo/sw\\.js)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};
export default config;
