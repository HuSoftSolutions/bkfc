import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The fund progress image reads its fonts from disk at request time;
  // make sure they ship with the function bundle.
  outputFileTracingIncludes: {
    "/api/funds/\\[slug\\]/image": ["./src/assets/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
