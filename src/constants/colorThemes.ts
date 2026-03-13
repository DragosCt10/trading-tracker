export type ColorThemeId = 'cyan' | 'purple' | 'emerald' | 'gold' | 'ice' | 'crimson' | 'neon-pink' | 'steel-gray' | 'sunset' | 'solar' | 'indigo' | 'teal' | 'silver' | 'burgundy' | 'copper' | 'ruby' | 'rose' | 'violet';

export type ColorTheme = {
  id: ColorThemeId;
  name: string;
  description: string;
  preview: {
    primary: string;
    accent: string;
    bgDark: string;
    bgLight: string;
  };
};

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'cyan',
    name: 'Electric Cyan',
    description: 'Midnight Blue + Electric Cyan',
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
    preview: {
      primary: '#8B5CF6',
      accent: '#5B21B6',
      bgDark: '#0E0B20',
      bgLight: '#FFFFFF',
    },
  },
];
