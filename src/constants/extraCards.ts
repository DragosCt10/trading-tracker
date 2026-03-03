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
  tooltip: string;
}

export const EXTRA_CARDS: readonly ExtraCardDefinition[] = [
  { key: 'setup_stats',       label: 'Pattern / Setup Stats',        image: '/images/extra-cards/placeholder.svg', tooltip: 'See how often each setup appears and how it performs (win rate, count). Useful for any strategy that names setups (e.g. Bos, FVG, OTE).' },
  { key: 'liquidity_stats',   label: 'Conditions / Liquidity Stats', image: '/images/extra-cards/placeholder.svg', tooltip: 'See how your results vary by market conditions and liquidity. Use with strategies that filter or tag by conditions (e.g. range, trending, thin).' },
  { key: 'mss_stats',         label: 'Market Structure Shift Stats', image: '/images/extra-cards/placeholder.svg', tooltip: 'See how trades around structure shifts perform (e.g. break of structure). Best for SMC/ICT or any strategy that trades MSS/BOS.' },
  { key: 'launch_hour',       label: 'Launch Hour Trades',           image: '/images/extra-cards/placeholder.svg', tooltip: 'See performance of trades during the launch—the break when algorithms slow down. Use with strategies that target the launch window.' },
  { key: 'local_hl_be_stats', label: 'Local H/L & BE Stats',        image: '/images/extra-cards/placeholder.svg', tooltip: 'See how often price hit local high/low plus break-even and the outcome. Useful for strategies that use LHs/LLs and move stops to BE.' },
  { key: 'partials_be_stats', label: 'Partials & BE Stats',          image: '/images/extra-cards/placeholder.svg', tooltip: 'See how taking partials and moving to break-even affects results. Best for strategies that scale out or manage risk with partials and BE.' },
  { key: 'avg_displacement',  label: 'Average Displacement Size',    image: '/images/extra-cards/placeholder.svg', tooltip: 'See the average move size (points) per market after entry. Use with displacement-based strategies to size targets and stops.' },
  { key: 'displacement_size', label: 'Displacement Size Stats',      image: '/images/extra-cards/placeholder.svg', tooltip: 'See the spread of move sizes (ranges) and win rate by range. Useful for displacement/SMC strategies to tune target ranges.' },
  { key: 'local_hl_stats',    label: 'Local H/L Stats',              image: '/images/extra-cards/placeholder.svg', tooltip: 'See how often local highs/lows were taken out and the resulting outcome. Best for strategies that trade or invalidation off local structure.' },
  { key: 'fvg_size',          label: 'FVG Size Stats',               image: '/images/extra-cards/placeholder.svg', tooltip: 'See fair value gap sizes and how they relate to your results. Use with FVG/ICT or any strategy that trades or filters by FVG size.' },
] as const;
