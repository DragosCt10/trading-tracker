import type { Metadata } from 'next';
import { TermsOfServiceClient } from './TermsOfServiceClient';
import { buildPageMetadata } from '@/constants/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Terms of Service',
  description:
    'Terms of Service for AlphaStats — read our terms and conditions for using the platform.',
  path: '/terms-of-service',
});

export default function TermsOfServicePage() {
  return <TermsOfServiceClient />;
}
