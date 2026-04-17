/** Derive a parent cookie domain (e.g. ".alpha-stats.com") so cookies are
 *  shared across www and non-www. Returns undefined for localhost / IP. */
export function getCookieDomain(): string | undefined {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_APP_URL ?? '').hostname;
    if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return undefined;
    return `.${host.replace(/^www\./, '')}`;
  } catch {
    return undefined;
  }
}
