export type ColorThemeId = 'cyan' | 'purple' | 'emerald' | 'gold' | 'ice' | 'crimson' | 'neon-pink' | 'steel-gray' | 'sunset' | 'solar' | 'indigo' | 'teal' | 'silver' | 'burgundy' | 'copper' | 'ruby' | 'rose' | 'violet';

export type ColorTheme = {
  id: ColorThemeId;
  name: string;
  description: string;
  /** Actual CSS variable values matching globals.css --tc-* for this theme */
  colors: {
    primary: string;
    accent: string;
    accentEnd: string;
  };
  preview: {
    primary: string;
    accent: string;
    bgDark: string;
    bgLight: string;
  };
};

/** Colors used when no theme is selected (globals.css default) */
export const DEFAULT_THEME_COLORS = {
  primary:   '#a855f7',
  accent:    '#8b5cf6',
  accentEnd: '#c026d3',
};

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'cyan',
    name: 'Electric Cyan',
    description: 'Midnight Blue + Electric Cyan',
    colors: { primary: '#06b6d4', accent: '#0ea5e9', accentEnd: '#0891b2' },
    preview: {
      primary: '#00C2FF',
      accent: '#3AE0FF',
      bgDark: '#0B0F1A',
      bgLight: '#f0f9ff',
    },
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    description: 'Deep Navy + Royal Purple',
    colors: { primary: '#a855f7', accent: '#7c3aed', accentEnd: '#c026d3' },
    preview: {
      primary: '#a855f7',
      accent: '#8b5cf6',
      bgDark: '#0d0a12',
      bgLight: '#ffffff',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Charcoal + Emerald',
    colors: { primary: '#10b981', accent: '#059669', accentEnd: '#047857' },
    preview: {
      primary: '#00B894',
      accent: '#00D9A5',
      bgDark: '#111111',
      bgLight: '#f0fdf4',
    },
  },
  {
    id: 'gold',
    name: 'Gold Premium',
    description: 'Black + Gold Premium',
    colors: { primary: '#f59e0b', accent: '#d97706', accentEnd: '#b45309' },
    preview: {
      primary: '#C6A75E',
      accent: '#E6C77A',
      bgDark: '#000000',
      bgLight: '#fffbf0',
    },
  },
  {
    id: 'ice',
    name: 'Ice Blue',
    description: 'Graphite + Ice Blue',
    colors: { primary: '#3b82f6', accent: '#2563eb', accentEnd: '#1d4ed8' },
    preview: {
      primary: '#4DA3FF',
      accent: '#7CC0FF',
      bgDark: '#1C1F26',
      bgLight: '#f0f5ff',
    },
  },
  {
    id: 'crimson',
    name: 'Crimson Red',
    description: 'Midnight Black + Crimson Red',
    colors: { primary: '#FF3B3B', accent: '#991B1B', accentEnd: '#660000' },
    preview: {
      primary: '#FF3B3B',
      accent: '#991B1B',
      bgDark: '#0B0B0B',
      bgLight: '#FFFFFF',
    },
  },
  {
    id: 'neon-pink',
    name: 'Neon Pink',
    description: 'Dark Violet + Neon Pink',
    colors: { primary: '#FF2BD6', accent: '#C026D3', accentEnd: '#A00BA5' },
    preview: {
      primary: '#FF2BD6',
      accent: '#C026D3',
      bgDark: '#140F2A',
      bgLight: '#FFFFFF',
    },
  },
  {
    id: 'steel-gray',
    name: 'Steel Gray',
    description: 'Graphite + Steel Gray',
    colors: { primary: '#8A8F98', accent: '#4B5563', accentEnd: '#2a3547' },
    preview: {
      primary: '#8A8F98',
      accent: '#4B5563',
      bgDark: '#111827',
      bgLight: '#FFFFFF',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    description: 'Dark Charcoal + Sunset Orange',
    colors: { primary: '#FF7A18', accent: '#C2410C', accentEnd: '#8B2500' },
    preview: {
      primary: '#FF7A18',
      accent: '#C2410C',
      bgDark: '#121212',
      bgLight: '#FFFFFF',
    },
  },
  {
    id: 'solar',
    name: 'Solar Yellow',
    description: 'Deep Black + Solar Yellow',
    colors: { primary: '#FFD400', accent: '#FACC15', accentEnd: '#DCAF2A' },
    preview: {
      primary: '#FFD400',
      accent: '#FACC15',
      bgDark: '#0A0A0A',
      bgLight: '#FFFFFF',
    },
  },
  {
    id: 'indigo',
    name: 'Indigo Night',
    description: 'Navy Blue + Indigo',
    colors: { primary: '#6366F1', accent: '#3730A3', accentEnd: '#1f1a60' },
    preview: {
      primary: '#6366F1',
      accent: '#3730A3',
      bgDark: '#0B1020',
      bgLight: '#FFFFFF',
    },
  },
  {
    id: 'teal',
    name: 'Ocean Teal',
    description: 'Deep Blue + Ocean Teal',
    colors: { primary: '#14B8A6', accent: '#0F766E', accentEnd: '#004D47' },
    preview: {
      primary: '#14B8A6',
      accent: '#0F766E',
      bgDark: '#0A1A24',
      bgLight: '#FFFFFF',
    },
  },
  {
    id: 'silver',
    name: 'Silver Tech',
    description: 'Carbon Black + Silver',
    colors: { primary: '#C0C6CF', accent: '#6B7280', accentEnd: '#3f4652' },
    preview: {
      primary: '#C0C6CF',
      accent: '#6B7280',
      bgDark: '#0D0D0D',
      bgLight: '#FFFFFF',
    },
  },
  {
    id: 'burgundy',
    name: 'Burgundy Elite',
    description: 'Dark Wine + Burgundy',
    colors: { primary: '#9F1239', accent: '#4C0519', accentEnd: '#1a0208' },
    preview: {
      primary: '#9F1239',
      accent: '#4C0519',
      bgDark: '#0B0B0B',
      bgLight: '#FFFFFF',
    },
  },
  {
    id: 'copper',
    name: 'Copper Pro',
    description: 'Matte Black + Copper',
    colors: { primary: '#C46A2E', accent: '#92400E', accentEnd: '#5a2305' },
    preview: {
      primary: '#C46A2E',
      accent: '#92400E',
      bgDark: '#0C0C0C',
      bgLight: '#FFFFFF',
    },
  },
  {
    id: 'ruby',
    name: 'Ruby Red',
    description: 'Deep Black + Ruby Red',
    colors: { primary: '#E11D48', accent: '#9F1239', accentEnd: '#660018' },
    preview: {
      primary: '#E11D48',
      accent: '#9F1239',
      bgDark: '#0A0A0A',
      bgLight: '#FFFFFF',
    },
  },
  {
    id: 'rose',
    name: 'Rose Pink',
    description: 'Midnight Purple + Rose Pink',
    colors: { primary: '#F472B6', accent: '#BE185D', accentEnd: '#831843' },
    preview: {
      primary: '#F472B6',
      accent: '#BE185D',
      bgDark: '#140C1F',
      bgLight: '#FFFFFF',
    },
  },
  {
    id: 'violet',
    name: 'Violet Pulse',
    description: 'Dark Indigo + Violet',
    colors: { primary: '#8B5CF6', accent: '#5B21B6', accentEnd: '#38086d' },
    preview: {
      primary: '#8B5CF6',
      accent: '#5B21B6',
      bgDark: '#0E0B20',
      bgLight: '#FFFFFF',
    },
  },
];
