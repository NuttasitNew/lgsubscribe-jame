import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: { inlineCss: true },
  trailingSlash: true,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [50, 75],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/images/optimized/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/cancel-contract",
        destination: "/faq/",
        permanent: true,
      },
      {
        source: "/price",
        destination: "/products/",
        permanent: true,
      },
      {
        source: "/authorize",
        destination: "/authorized/",
        permanent: true,
      },
      {
        source: "/payment-options",
        destination: "/faq/",
        permanent: true,
      },
      {
        source: "/terms",
        destination: "/faq/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
