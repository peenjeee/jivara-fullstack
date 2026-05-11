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
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=()",
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

const publicAssetCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=604800, stale-while-revalidate=86400",
  },
  {
    key: "Expires",
    value: "Tue, 11 May 2027 00:00:00 GMT",
  },
];

const serviceWorkerCacheHeaders = [
  {
    key: "Cache-Control",
    value: "no-cache, no-store, max-age=0, must-revalidate",
  },
  {
    key: "Pragma",
    value: "no-cache",
  },
  {
    key: "Expires",
    value: "0",
  },
];

const manifestCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=3600, must-revalidate",
  },
];

const getApiImageRemotePattern = () => {
  try {
    const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL || "https://api.jivara.web.id/api");
    return {
      protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
      hostname: apiUrl.hostname,
    };
  } catch {
    return {
      protocol: "https" as const,
      hostname: "api.jivara.web.id",
    };
  }
};

const nextConfig: NextConfig = {
  compress: true,
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
      getApiImageRemotePattern(),
      {
        protocol: "https",
        hostname: "jivara-production.up.railway.app",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: publicAssetCacheHeaders,
      },
      {
        source: "/icons/:path*",
        headers: publicAssetCacheHeaders,
      },
      {
        source: "/models/:path*",
        headers: publicAssetCacheHeaders,
      },
      {
        source: "/videos/:path*",
        headers: publicAssetCacheHeaders,
      },
      {
        source: "/favicon.ico",
        headers: publicAssetCacheHeaders,
      },
      {
        source: "/sw.js",
        headers: serviceWorkerCacheHeaders,
      },
      {
        source: "/manifest.json",
        headers: manifestCacheHeaders,
      },
      {
        source: "/",
        headers: baseSecurityHeaders,
      },
      {
        source: "/:path((?!dashboard|patients|schedule|activity-log|settings|food-scan|nurses|admin-approvals|account-status).*)",
        headers: baseSecurityHeaders,
      },
      {
        source: "/dashboard/:path*",
        headers: [...baseSecurityHeaders, ...privateCacheHeaders],
      },
      {
        source: "/patients/:path*",
        headers: [...baseSecurityHeaders, ...privateCacheHeaders],
      },
      {
        source: "/schedule/:path*",
        headers: [...baseSecurityHeaders, ...privateCacheHeaders],
      },
      {
        source: "/activity-log/:path*",
        headers: [...baseSecurityHeaders, ...privateCacheHeaders],
      },
      {
        source: "/settings/:path*",
        headers: [...baseSecurityHeaders, ...privateCacheHeaders],
      },
      {
        source: "/food-scan/:path*",
        headers: [...baseSecurityHeaders, ...privateCacheHeaders],
      },
      {
        source: "/nurses/:path*",
        headers: [...baseSecurityHeaders, ...privateCacheHeaders],
      },
      {
        source: "/admin-approvals/:path*",
        headers: [...baseSecurityHeaders, ...privateCacheHeaders],
      },
      {
        source: "/account-status/:path*",
        headers: [...baseSecurityHeaders, ...privateCacheHeaders],
      },
    ];
  },
};

export default nextConfig;
