export type ColorThemeId = 'cyan' | 'purple' | 'emerald' | 'gold' | 'ice';

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
];
