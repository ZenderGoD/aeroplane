import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.planespotters.net",
      },
      {
        protocol: "https",
        hostname: "cdn.planespotters.net",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  // Allow the embed page to be iframed
  async headers() {
    return [
      {
        source: "/embed",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
        ],
      },
    ];
  },
  // Compress output
  compress: true,
  // Power header
  poweredByHeader: false,
};

export default nextConfig;
