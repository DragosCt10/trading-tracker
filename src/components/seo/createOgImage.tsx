import { ImageResponse } from 'next/og';
import { SITE_URL, SITE_NAME } from '@/constants/seo';

// Brand gradient tokens resolved to hex at build time.
// Source: `--orb-1` / `--orb-2` CSS custom props from the color theme.
// ImageResponse runs in a minimal runtime that cannot read CSS vars,
// so these are hardcoded here and kept in sync with globals.css.
const BRAND_GRADIENT_FROM = '#6366f1'; // indigo-500 (matches light/dark --orb-1)
const BRAND_GRADIENT_TO = '#8b5cf6';   // violet-500 (matches --orb-2)
const BG_DARK = '#0d0a12';

export const OG_SIZE = { width: 1200, height: 630 } as const;

type Options = {
  title: string;
  eyebrow?: string;
};

/**
 * Returns an ImageResponse (1200x630 PNG) with the site brand gradient,
 * logo top-left, and the given title centered. Intended to be called from
 * `app/**​/opengraph-image.tsx` route handlers. Callers should also export:
 *
 *   export const size = OG_SIZE;
 *   export const contentType = 'image/png';
 *   export const dynamic = 'force-static';
 *
 * so the image is baked at build time (zero runtime cost).
 */
export function createOgImage({ title, eyebrow }: Options): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: BG_DARK,
          backgroundImage: `radial-gradient(circle at 20% 0%, ${BRAND_GRADIENT_FROM}55 0%, transparent 55%), radial-gradient(circle at 100% 100%, ${BRAND_GRADIENT_TO}44 0%, transparent 55%)`,
          color: '#fafafa',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* next/image is not supported inside next/og ImageResponse. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${SITE_URL}/alpha-stats-logo-light.png`}
            alt=""
            width={72}
            height={72}
            style={{ borderRadius: 12 }}
          />
          <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>
            {SITE_NAME}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {eyebrow ? (
            <span
              style={{
                fontSize: 28,
                color: '#c4b5fd',
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              {eyebrow}
            </span>
          ) : null}
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              maxWidth: 1000,
            }}
          >
            {title}
          </span>
        </div>

        <div
          style={{
            fontSize: 24,
            color: '#a1a1aa',
          }}
        >
          alpha-stats.com
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
    },
  );
}
