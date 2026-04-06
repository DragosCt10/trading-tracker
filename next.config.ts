const isDev = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const nextConfig = {
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
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Webpack uses eval() for source maps in development.
              // vercel.live: Vercel preview deployment toolbar/feedback widget.
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://vercel.live`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              // Supabase Realtime uses wss:// websockets; allow both HTTP + WS schemes.
              // vercel.live: Vercel toolbar sends feedback data back.
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live",
              "font-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
}

export default nextConfig;
