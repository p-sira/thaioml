import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: '/:path+/',
          destination: 'http://localhost:8000/:path+/',
        },
        {
          source: '/:path*',
          destination: 'http://localhost:8000/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
