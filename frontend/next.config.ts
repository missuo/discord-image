import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  distDir: "../public",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
