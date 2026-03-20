import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep Turbopack scoped to this app even when other lockfiles exist nearby.
    root: process.cwd(),
  },
  reactCompiler: true,
};

export default nextConfig;
