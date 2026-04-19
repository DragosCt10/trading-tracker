import { createOgImage, OG_SIZE } from '@/components/seo/createOgImage';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const dynamic = 'force-static';
export const alt = 'AlphaStats — Trading Journal & Analytics';

export default function Image() {
  return createOgImage({
    title: 'Track your trades. Stop losing money.',
    eyebrow: 'Trading Journal',
  });
}
