import { createOgImage, OG_SIZE } from '@/components/seo/createOgImage';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const dynamic = 'force-static';
export const alt = 'AlphaStats Affiliates — Earn recurring commission';

export default function Image() {
  return createOgImage({
    title: 'Refer traders. Earn recurring.',
    eyebrow: 'Affiliates',
  });
}
