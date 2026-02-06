import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // Use our custom worker
  // @ts-expect-error - swSrc is supported but typed incorrectly in some versions
  swSrc: "src/worker/index.ts",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    // Skip Babel transpilation that causes _async_to_generator issues
  },
  // Explicitly set to not use Babel for the worker
  // @ts-expect-error - experimental option
  extendDefaultRuntimeCaching: false,
});

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    // Ensure JWT_SECRET is available in Edge Runtime (Middleware)
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-change-in-prod',
  },
};

export default withPWA(nextConfig);
