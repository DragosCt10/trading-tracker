import type { TagColor } from '@/types/saved-tag';

export const TAG_COLORS: TagColor[] = [
  'purple', 'cyan', 'emerald', 'gold', 'ice', 'crimson', 'neon-pink', 'sunset', 'indigo', 'slate',
];

export interface TagColorStyle {
  /** CSS gradient string for chip backgrounds */
  gradient: string;
  /** Solid hex for color picker swatches */
  dotColor: string;
  /** Human-readable label */
  label: string;
}

/** Gradient colors sourced from globals.css theme palettes (tc-primary → tc-accent → tc-accent-end). */
export const TAG_COLOR_STYLES: Record<TagColor, TagColorStyle> = {
  purple:      { gradient: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 50%, #c026d3 100%)', dotColor: '#a855f7',  label: 'Purple'    },
  cyan:        { gradient: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0891b2 100%)', dotColor: '#06b6d4',  label: 'Cyan'      },
  emerald:     { gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)', dotColor: '#10b981',  label: 'Emerald'   },
  gold:        { gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)', dotColor: '#f59e0b',  label: 'Gold'      },
  ice:         { gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)', dotColor: '#3b82f6',  label: 'Ice Blue'  },
  crimson:     { gradient: 'linear-gradient(135deg, #FF3B3B 0%, #991B1B 50%, #660000 100%)', dotColor: '#FF3B3B',  label: 'Crimson'   },
  'neon-pink': { gradient: 'linear-gradient(135deg, #FF2BD6 0%, #C026D3 50%, #A00BA5 100%)', dotColor: '#FF2BD6',  label: 'Neon Pink' },
  sunset:      { gradient: 'linear-gradient(135deg, #FF7A18 0%, #C2410C 50%, #8B2500 100%)', dotColor: '#FF7A18',  label: 'Sunset'    },
  indigo:      { gradient: 'linear-gradient(135deg, #6366F1 0%, #3730A3 50%, #1f1a60 100%)', dotColor: '#6366F1',  label: 'Indigo'    },
  slate:       { gradient: 'linear-gradient(135deg, #64748b 0%, #475569 50%, #334155 100%)', dotColor: '#64748b',  label: 'Gray'      },
};

/** Safely resolve a color style — falls back to slate for unknown/legacy values. */
export function resolveTagColorStyle(color: string | undefined): TagColorStyle {
  if (!color) return TAG_COLOR_STYLES['slate'];
  return (TAG_COLOR_STYLES as Record<string, TagColorStyle>)[color] ?? TAG_COLOR_STYLES['slate'];
}
