/** Returns true only for http:// and https:// URLs. Blocks javascript:, data:, etc. */
export function isSafeUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}
