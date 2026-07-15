import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  serverExternalPackages: ["@node-rs/argon2", "@node-rs/bcrypt"],
  images: {
    remotePatterns: [
      {
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "f003.backblazeb2.com",
        pathname: "/file/SENZEMO/**",
      },
    ],
  },
};

export default nextConfig;
