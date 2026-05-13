import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@palpalworld/shared", "@palpalworld/game-core"],
};

export default nextConfig;
