import type { MetadataRoute } from 'next';

const SITE_URL = 'https://alpha-stats.com';

const isProduction =
  process.env.VERCEL_ENV === 'production' ||
  (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production');

export default function robots(): MetadataRoute.Robots {
  if (!isProduction) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/login',
          '/signup',
          '/reset-password',
          '/update-password',
          '/admin',
          '/insight-vault',
          '/rewards',
          '/stats',
          '/settings',
          '/trade-ledger',
          '/strategy',
          '/strategy/',
          '/feed',
          '/feed/',
          '/profile/',
        ],
      },
    ],
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
