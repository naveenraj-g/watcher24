import type { NextConfig } from "next";

// Dashboard does not need next-intl — it is an internal single-locale tool.
const nextConfig: NextConfig = {
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "standalone",
};

export default nextConfig;
