/** Strip Discord mentions and formatting to prevent abuse via webhook embeds. */
export function sanitizeForDiscord(text: string): string {
  return text
    .replace(/@(everyone|here)/gi, '@\u200b$1')
    .replace(/<@[!&]?\d+>/g, '[mention removed]')
    .replace(/<#\d+>/g, '[channel removed]');
}
