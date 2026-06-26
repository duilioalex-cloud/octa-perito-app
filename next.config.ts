import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 2,
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
