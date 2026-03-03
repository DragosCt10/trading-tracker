const MAX_SAVED_LIQUIDITY_TYPES = 11;

/**
 * Merges a typed liquidity value into the user's saved liquidity types list.
 * Case-insensitive deduplication — appends only if not already present.
 * Maximum 11 saved types; no-op if already at limit.
 * Returns the updated list (does not mutate the original).
 */
export function mergeLiquidityTypeIntoSaved(
  typedName: string,
  savedLiquidityTypes: string[]
): string[] {
  const trimmed = typedName.trim();
  if (!trimmed) return savedLiquidityTypes;
  if (savedLiquidityTypes.length >= MAX_SAVED_LIQUIDITY_TYPES) return savedLiquidityTypes;

  const lower = trimmed.toLowerCase();
  const alreadyExists = savedLiquidityTypes.some(
    (s) => s.trim().toLowerCase() === lower
  );

  if (alreadyExists) return savedLiquidityTypes;

  return [...savedLiquidityTypes, trimmed];
}
