import type { Metadata } from 'next';
import { RefundPolicyClient } from './RefundPolicyClient';
import { buildPageMetadata } from '@/constants/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Refund Policy',
  description:
    'Refund Policy for AlphaStats — understand our refund, cancellation, and billing policies.',
  path: '/refund-policy',
});

export default function RefundPolicyPage() {
  return <RefundPolicyClient />;
}
