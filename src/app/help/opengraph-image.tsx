import { createOgImage, OG_SIZE } from '@/components/seo/createOgImage';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const dynamic = 'force-static';
export const alt = 'AlphaStats Help Center';

export default function Image() {
  return createOgImage({
    title: 'Everything you need to run your trading journal.',
    eyebrow: 'Help Center',
  });
}
