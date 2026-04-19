import { createOgImage, OG_SIZE } from '@/components/seo/createOgImage';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const dynamic = 'force-static';
export const alt = 'AlphaStats Pricing — Plans for every trader';

export default function Image() {
  return createOgImage({
    title: 'Simple pricing for serious traders.',
    eyebrow: 'Pricing',
  });
}
