import type { Metadata } from 'next';

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://alpha-stats.com';
export const SITE_NAME = 'AlphaStats';
export const DEFAULT_OG_IMAGE = '/thumbnail.jpg';
export const DEFAULT_DESCRIPTION =
  'Built for traders, by traders. Stop guessing, start improving.';

export function canonicalUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const stripped = normalized === '/' ? '/' : normalized.replace(/\/$/, '');
  return `${SITE_URL}${stripped}`;
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const { title, description, path } = input;
  const absoluteUrl = canonicalUrl(path);
  const isRoot = path === '/';
  // Root path bypasses the root layout's `%s | AlphaStats` title.template so
  // the home title doesn't duplicate to "... | AlphaStats". Other pages let
  // the template apply.
  const titleField = isRoot ? { absolute: title } : title;
  return {
    title: titleField,
    description,
    alternates: { canonical: isRoot ? '/' : path },
    openGraph: {
      title,
      description,
      url: absoluteUrl,
      siteName: SITE_NAME,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}
