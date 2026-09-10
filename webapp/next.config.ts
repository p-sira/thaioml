import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: "/home/psira/Code/web/thaioml",
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
