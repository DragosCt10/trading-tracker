import type { Metadata } from 'next';
import { PrivacyPolicyClient } from './PrivacyPolicyClient';
import { buildPageMetadata } from '@/constants/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description:
    'Privacy Policy for AlphaStats — learn how we collect, use, and protect your data.',
  path: '/privacy-policy',
});

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />;
}
