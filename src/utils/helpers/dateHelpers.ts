/** Returns the number of complete calendar months elapsed since the given ISO date string. */
export function monthsSince(isoDate: string): number {
  const start = new Date(isoDate);
  const now = new Date();
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}
