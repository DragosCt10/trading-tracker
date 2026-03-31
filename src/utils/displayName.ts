/**
 * Derives a consistent 4-digit suffix from a profile UUID so that
 * private profiles always show the same anonymised name.
 */
export function getAnonymousDisplayName(profileId: string): string {
  const hex = profileId.replace(/-/g, '').slice(0, 8);
  const num = (parseInt(hex, 16) % 9000) + 1000;
  return `Trader${num}`;
}

/**
 * Returns the name to display publicly for a profile.
 * - Public profiles  → real display_name
 * - Private profiles → Trader#### (deterministic, based on profile id)
 *   unless `isOwner` is true, in which case the real name is shown.
 */
export function getPublicDisplayName(
  profile: { id: string; display_name: string | null; is_public: boolean },
  isOwner = false,
): string {
  if (!profile.is_public && !isOwner) {
    return getAnonymousDisplayName(profile.id);
  }
  return profile.display_name ?? 'Unknown';
}
