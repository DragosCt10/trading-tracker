import * as fuzz from 'fuzzball';
import type { SavedNewsItem } from '@/types/account-settings';

/** Trim, lowercase, collapse whitespace */
export function normalizeNewsName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Finds an existing SavedNewsItem whose canonical name or aliases are
 * fuzzily similar to `input` (token_set_ratio, same algo as columnMatcher).
 * Returns the best match above `threshold` (default 70), or null.
 */
export function findSimilarNews(
  input: string,
  savedNews: SavedNewsItem[],
  threshold = 70
): SavedNewsItem | null {
  if (!input.trim() || savedNews.length === 0) return null;

  const normalised = normalizeNewsName(input);
  let best: { item: SavedNewsItem; score: number } | null = null;

  for (const item of savedNews) {
    const candidates = [item.name, ...(item.aliases ?? [])].map(normalizeNewsName);
    const topScore = Math.max(...candidates.map((c) => fuzz.token_set_ratio(normalised, c)));

    if (topScore > (best?.score ?? threshold - 1)) {
      best = { item, score: topScore };
    }
  }

  return best && best.score >= threshold ? best.item : null;
}

/**
 * Merges a new trade's news into the account's saved news list.
 * - If a similar entry already exists: updates intensity + adds the typed
 *   name as an alias (if different from the canonical name).
 * - Otherwise appends a brand-new entry.
 * Returns the updated list (does not mutate the original).
 */
export function mergeNewsIntoSaved(
  typedName: string,
  intensity: number | null,
  savedNews: SavedNewsItem[]
): SavedNewsItem[] {
  const canonical = normalizeNewsName(typedName);
  const match = findSimilarNews(typedName, savedNews);

  if (match) {
    return savedNews.map((item) => {
      if (item.id !== match.id) return item;
      const existingAliases = item.aliases ?? [];
      const needsAlias =
        canonical !== normalizeNewsName(item.name) &&
        !existingAliases.some((a) => normalizeNewsName(a) === canonical);
      return {
        ...item,
        // Only overwrite intensity when the user explicitly selected one
        ...(intensity !== null ? { intensity } : {}),
        aliases: needsAlias ? [...existingAliases, typedName.trim()] : existingAliases,
      };
    });
  }

  const newItem: SavedNewsItem = {
    id: crypto.randomUUID(),
    name: typedName.trim(),
    intensity: intensity ?? 1,
    aliases: [],
  };
  return [...savedNews, newItem];
}
