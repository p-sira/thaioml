import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from "next";
import path from "path";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  /* config options here */
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default withMDX(nextConfig);
