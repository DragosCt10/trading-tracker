import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  experimental: {
    staleTimes: {
      dynamic: 300, // 5 minutes (default: 30s) — reduces cold-nav after idle
      static: 600,  // 10 minutes (default: 5min)
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https' as const,
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            // HSTS stays here as a static header (does not need to be dynamic).
            // The full CSP is generated per-request in src/proxy.ts with a nonce.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
}

export default nextConfig;
