/**
 * Sort a list so pinned items appear first, in pin order.
 * Used by comboboxes when displaying DB-backed favourites (strategy.saved_favourites).
 */
export function sortByPins<T>(
  items: T[],
  pinnedIds: string[],
  getItemId: (item: T) => string
): T[] {
  if (pinnedIds.length === 0) return items;
  const pinnedSet = new Set(pinnedIds);
  const pinOrder = new Map(pinnedIds.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const aId = getItemId(a);
    const bId = getItemId(b);
    const aPinned = pinnedSet.has(aId);
    const bPinned = pinnedSet.has(bId);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    if (aPinned && bPinned) {
      return (pinOrder.get(aId) ?? 0) - (pinOrder.get(bId) ?? 0);
    }
    return 0;
  });
}
