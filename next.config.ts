import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["192.168.29.69", "localhost:3000"],
    },
  },
};

export default nextConfig;
