import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // dev only: lets phones/other devices on the home network open the dev server by IP
  allowedDevOrigins: ['192.168.*.*'],
};

export default nextConfig;
