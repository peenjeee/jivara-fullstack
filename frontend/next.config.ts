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
  {
<<<<<<< HEAD
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
=======
>>>>>>> 8a7f1be6f803b40acec9a5c09aacc382e4c554b1
    key: "Cache-Control",
    value: "private, no-cache, no-store, max-age=0, must-revalidate",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
<<<<<<< HEAD
=======
];

// Strict cross-origin isolation headers — breaks model-viewer blob texture loading
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
>>>>>>> 8a7f1be6f803b40acec9a5c09aacc382e4c554b1
];

// Strict cross-origin isolation headers — breaks model-viewer blob texture loading
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
      // All other routes — full cross-origin isolation
      {
        source: "/((?!$).*)",
        headers: [...baseSecurityHeaders, ...crossOriginIsolationHeaders],
      },
    ];
  },
};

export default nextConfig;

