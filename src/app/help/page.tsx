import type { Metadata } from 'next';
import { HelpCenterClient } from './HelpCenterClient';
import { buildPageMetadata } from '@/constants/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbSchema } from '@/constants/schemas';

export const metadata: Metadata = buildPageMetadata({
  title: 'Help Center',
  description:
    'Find answers to common questions about AlphaStats — getting started, trading journal, statistics, account management, and more.',
  path: '/help',
});

export default function HelpPage() {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Help Center', path: '/help' },
  ]);
  return (
    <>
      <JsonLd payload={breadcrumbSchema} />
      <HelpCenterClient />
    </>
  );
}
