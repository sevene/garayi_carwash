import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // Cache next.js static assets
        urlPattern: /^https?.+?\/_next\/static\/.+$/,
        handler: 'StaleWhileRevalidate',
      },
      {
        // Cache images
        urlPattern: /^https?.+?\.(?:png|jpg|jpeg|svg|webp|gif|ico)$/,
        handler: 'StaleWhileRevalidate',
      },
      {
        // FORCE NETWORK ONLY for health check so we don't get cached 200 responses when offline
        urlPattern: ({ url }) => url.pathname === '/api/health',
        handler: 'NetworkOnly',
      },
      {
        // Cache API calls (except sync which we handle manually, but good to have fallback)
        urlPattern: /^https?.+?\/api\/.+$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60 // 1 day
          }
        }
      },
      {
        // Cache navigation routes (PAGES) - Critical for offline navigation
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60 // 24 hours
          }
        }
      }
    ]
  }
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
