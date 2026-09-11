import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  async rewrites() {
    // In production, this should point to the raw MkDocs deployment (e.g. https://thaioml-docs.pages.dev)
    const siteUrl = process.env.DOCS_UPSTREAM_URL || 'http://localhost:8000';
    return {
      fallback: [
        {
          source: '/:path+/',
          destination: `${siteUrl}/:path+/`,
        },
        {
          source: '/:path*',
          destination: `${siteUrl}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
