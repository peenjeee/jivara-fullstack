import type { NextConfig } from "next";
import path from "node:path";

const baseSecurityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=()",
  },
  {
    key: "Access-Control-Allow-Origin",
    value: "https://www.jivara.web.id",
  },
  ...(process.env.NODE_ENV === "production" ? [{
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  }] : []),
];

const privateCacheHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-cache, no-store, max-age=0, must-revalidate",
  },
];

const crossOriginIsolationHeaders = [
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Embedder-Policy",
    value: "require-corp",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: path.resolve(__dirname)
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      // Landing page — relaxed COEP for model-viewer 3D rendering
      {
        source: "/",
        headers: baseSecurityHeaders,
      },
      {
        source: "/:path((?!dashboard|patients|schedule|activity-log|settings|food-scan).*)",
        headers: [...baseSecurityHeaders, ...crossOriginIsolationHeaders],
      },
      {
        source: "/dashboard/:path*",
        headers: [...baseSecurityHeaders, ...crossOriginIsolationHeaders, ...privateCacheHeaders],
      },
      {
        source: "/patients/:path*",
        headers: [...baseSecurityHeaders, ...crossOriginIsolationHeaders, ...privateCacheHeaders],
      },
      {
        source: "/schedule/:path*",
        headers: [...baseSecurityHeaders, ...crossOriginIsolationHeaders, ...privateCacheHeaders],
      },
      {
        source: "/activity-log/:path*",
        headers: [...baseSecurityHeaders, ...crossOriginIsolationHeaders, ...privateCacheHeaders],
      },
      {
        source: "/settings/:path*",
        headers: [...baseSecurityHeaders, ...crossOriginIsolationHeaders, ...privateCacheHeaders],
      },
      {
        source: "/food-scan/:path*",
        headers: [...baseSecurityHeaders, ...crossOriginIsolationHeaders, ...privateCacheHeaders],
      },
    ];
  },
};

export default nextConfig;

