import type { Metadata } from 'next';
import { ContactClient } from './ContactClient';
import { buildPageMetadata } from '@/constants/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact',
  description:
    'Get in touch with the AlphaStats team. Report bugs, request features, ask questions, or explore partnerships.',
  path: '/contact',
});

export default function ContactPage() {
  return <ContactClient />;
}
