/**
 * Merges a typed setup type into the user's saved setup types list.
 * Case-insensitive deduplication — appends only if not already present.
 * Returns the updated list (does not mutate the original).
 */
export function mergeSetupTypeIntoSaved(
  typedName: string,
  savedSetupTypes: string[]
): string[] {
  const trimmed = typedName.trim();
  if (!trimmed) return savedSetupTypes;

  const lower = trimmed.toLowerCase();
  const alreadyExists = savedSetupTypes.some(
    (s) => s.trim().toLowerCase() === lower
  );

  if (alreadyExists) return savedSetupTypes;

  return [...savedSetupTypes, trimmed];
}
