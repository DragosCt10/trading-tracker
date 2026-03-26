export type TagColor =
  | 'slate'
  | 'purple'
  | 'cyan'
  | 'emerald'
  | 'gold'
  | 'ice'
  | 'crimson'
  | 'neon-pink'
  | 'sunset'
  | 'indigo';

export interface SavedTag {
  name: string;
  color?: TagColor;
}

/** Normalizes raw DB value — handles both old string[] rows and new SavedTag[] rows */
export function normalizeSavedTags(raw: unknown): SavedTag[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) =>
    typeof item === 'string' ? { name: item } : (item as SavedTag)
  );
}
