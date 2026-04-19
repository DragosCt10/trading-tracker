import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/constants/seo';

const isProduction =
  process.env.VERCEL_ENV === 'production' ||
  (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production');

const PUBLIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/',                 priority: 1.0, changeFrequency: 'weekly'  },
  { path: '/pricing',          priority: 0.9, changeFrequency: 'monthly' },
  { path: '/help',             priority: 0.7, changeFrequency: 'monthly' },
  { path: '/affiliates',       priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact',          priority: 0.5, changeFrequency: 'yearly'  },
  { path: '/terms-of-service', priority: 0.3, changeFrequency: 'yearly'  },
  { path: '/privacy-policy',   priority: 0.3, changeFrequency: 'yearly'  },
  { path: '/refund-policy',    priority: 0.3, changeFrequency: 'yearly'  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isProduction) return [];

  const lastModified = new Date();
  return PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
