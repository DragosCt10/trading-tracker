import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  // `dukascopy-node` is a server-only Node package used by the backtest API
  // route. Its dependency `fastest-validator` has an optional `require('cli-
  // highlight')` for pretty-printing validation errors, which the bundler
  // tries to resolve and fails on. Listing it here keeps it as a runtime
  // require on the server (not bundled), avoiding the cli-highlight resolve
  // and shrinking the route's bundle.
  serverExternalPackages: ['dukascopy-node', 'fastest-validator', '@aws-sdk/client-s3'],
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
      {
        protocol: 'https' as const,
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https' as const,
        hostname: 'avatars.githubusercontent.com',
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
