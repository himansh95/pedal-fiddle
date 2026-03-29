import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Strava athlete profile pictures
        protocol: 'https',
        hostname: 'dgalywyr863hv.cloudfront.net',
      },
      {
        // Strava CDN (alternate)
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
    ],
  },
};

export default nextConfig;
