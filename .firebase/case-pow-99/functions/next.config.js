"use strict";

// next.config.js
var nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"]
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.dispatch.bld.co.ke"
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com"
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" }
        ]
      }
    ];
  }
};
module.exports = nextConfig;
