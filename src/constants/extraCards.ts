export type ExtraCardKey =
  | 'setup_stats'
  | 'liquidity_stats'
  | 'mss_stats'
  | 'launch_hour'
  | 'local_hl_be_stats'
  | 'partials_be_stats'
  | 'avg_displacement'
  | 'displacement_size'
  | 'local_hl_stats'
  | 'fvg_size';

export interface ExtraCardDefinition {
  key: ExtraCardKey;
  label: string;
  image: string;
}

export const EXTRA_CARDS: readonly ExtraCardDefinition[] = [
  { key: 'setup_stats',       label: 'Pattern / Setup Stats',        image: '/images/extra-cards/placeholder.svg' },
  { key: 'liquidity_stats',   label: 'Conditions / Liquidity Stats', image: '/images/extra-cards/placeholder.svg' },
  { key: 'mss_stats',         label: 'Market Structure Shift Stats', image: '/images/extra-cards/placeholder.svg' },
  { key: 'launch_hour',       label: 'Launch Hour Trades',           image: '/images/extra-cards/placeholder.svg' },
  { key: 'local_hl_be_stats', label: 'Local H/L & BE Stats',        image: '/images/extra-cards/placeholder.svg' },
  { key: 'partials_be_stats', label: 'Partials & BE Stats',          image: '/images/extra-cards/placeholder.svg' },
  { key: 'avg_displacement',  label: 'Average Displacement Size',    image: '/images/extra-cards/placeholder.svg' },
  { key: 'displacement_size', label: 'Displacement Size Stats',      image: '/images/extra-cards/placeholder.svg' },
  { key: 'local_hl_stats',    label: 'Local H/L Stats',              image: '/images/extra-cards/placeholder.svg' },
  { key: 'fvg_size',          label: 'FVG Size Stats',               image: '/images/extra-cards/placeholder.svg' },
] as const;
