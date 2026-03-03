const MAX_SAVED_SETUP_TYPES = 11;

/**
 * Merges a typed setup type into the user's saved setup types list.
 * Case-insensitive deduplication — appends only if not already present.
 * Maximum 11 saved types; no-op if already at limit.
 * Returns the updated list (does not mutate the original).
 */
export function mergeSetupTypeIntoSaved(
  typedName: string,
  savedSetupTypes: string[]
): string[] {
  const trimmed = typedName.trim();
  if (!trimmed) return savedSetupTypes;
  if (savedSetupTypes.length >= MAX_SAVED_SETUP_TYPES) return savedSetupTypes;

  const lower = trimmed.toLowerCase();
  const alreadyExists = savedSetupTypes.some(
    (s) => s.trim().toLowerCase() === lower
  );

  if (alreadyExists) return savedSetupTypes;

  return [...savedSetupTypes, trimmed];
}
