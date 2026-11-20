import type { NextConfig } from "next";

// Content-Security-Policy is set per-request by middleware (src/middleware.ts)
// with a unique nonce to eliminate 'unsafe-inline'. Only static security headers
// that don't require per-request values are set here.

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), geolocation=(), microphone=(), payment=(self), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
