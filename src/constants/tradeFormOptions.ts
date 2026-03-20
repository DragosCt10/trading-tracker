export const MSS_OPTIONS = ['Normal', 'Aggressive', 'Wick', 'Internal'] as const;
export const EVALUATION_OPTIONS = ['A+', 'A', 'B', 'C'] as const;
export const SESSION_OPTIONS = ['Sydney', 'Tokyo', 'London', 'New York'] as const;

export const SCREEN_TIMEFRAME_OPTIONS = ['4H', '1H', '15m', '5m', '3m', '1m', 'Custom'] as const;
export const SCREEN_TIMEFRAME_PRESET_OPTIONS = ['4H', '1H', '15m', '5m', '3m', '1m'] as const;

export const POTENTIAL_RR_OPTIONS: { value: number; label: string }[] = [
  ...Array.from({ length: 19 }, (_, i) => {
    const v = 1 + i * 0.5;
    return { value: v, label: String(v) };
  }),
  { value: 10.5, label: '10+' },
];
