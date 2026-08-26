import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/cancel-contract",
        destination: "/faq/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
