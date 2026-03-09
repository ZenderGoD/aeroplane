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
    ],
  },
};

export default nextConfig;
