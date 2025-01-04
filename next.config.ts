import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        dynamicIO: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.googleusercontent.com',
                port: '',
                search: '',
            },
        ],
    },
};

export default nextConfig;
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
// import "./src/env.js";

// /** @type {import("next").NextConfig} */
// const config = {};

// export default config;
