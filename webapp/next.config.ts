import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from "next";
import path from "path";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default withMDX(nextConfig);
