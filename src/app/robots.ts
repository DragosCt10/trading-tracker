import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/constants/seo';

// Sitemap is served at /sitemap.xml via src/app/sitemap.ts (single default export).
// If that ever migrates to the generateSitemaps API, paths move to /sitemap/<id>.xml —
// update the sitemap URL below to match or emit a sitemap-index.xml here.

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
