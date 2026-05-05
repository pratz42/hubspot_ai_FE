import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_URL || "https://hubspot-aicraft-production.up.railway.app";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
