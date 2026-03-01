// types.ts
export interface MonthlyStats {
  wins: number;
  losses: number;
  winRate: number;           // excluding break-even
  profit: number;
  beWins: number;
  beLosses: number;
  winRateWithBE: number;     // including break-even
}

export interface BestWorstMonth {
  month: string;
  stats: MonthlyStats;
}

export interface MonthlyStatsResult {
  monthlyData: Record<string, MonthlyStats>;
  bestMonth: BestWorstMonth | null;
  worstMonth: BestWorstMonth | null;
}

export interface MacroStats {
  profitFactor: number;
  consistencyScore: number;        // excluding BE
  consistencyScoreWithBE: number;  // including BE
  sharpeWithBE: number;            // including BE
  tradeQualityIndex: number;
  multipleR: number;
}

export interface BaseStats {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  winRateWithBE: number;
  /** Break-even trades (wins, losses, breakEven). */
  breakEven: number;
}

export interface LiquidityStats extends BaseStats {
  liquidity: string;
}

export interface SetupStats extends BaseStats {
  setup: string;
}

export interface DirectionStats extends BaseStats {
  direction: string;
}
export interface DayStats extends BaseStats {
  day: string;
}

export interface MarketStats extends BaseStats {
  market: string;
  profit: number;
  pnlPercentage: number;
  profitTaken: boolean;
}

export interface EvaluationStats extends BaseStats {
  grade: string;
}

export interface TradeTypeStats extends BaseStats {
  tradeType: string;
}

export interface NewsStats extends BaseStats {
  news: string;
}

/** Stats per news event name (e.g. CPI, NFP) with wins, losses, BE and intensity. */
export interface NewsNameStats extends BaseStats {
  newsName: string;
  /** Average intensity 1–3 (Low/Medium/High) for this news event. */
  averageIntensity: number | null;
}

export interface MssStats extends BaseStats {
  mss: string;
}

export interface SLSizeStats {
  market: string;
  averageSlSize: number;
}

export interface LocalHLStats {
  [key: string]: {
    wins: number;
    losses: number;
    winRate: number;
    breakEven: number;
    winRateWithBE: number;
    total: number;
  }
}

export interface IntervalStats {
  label: string;
  wins: number;
  losses: number;
  breakEven: number;
  winRate: number;
  winRateWithBE: number;
}

export interface RiskStats {
  total: number;
  wins: number;
  losses: number;
  breakEven: number;
  beWins: number;
  beLosses: number;
  winrate: number;
  winrateWithBE: number;
}

/** Key is e.g. risk025, risk03, risk1. Record allows any number of risk levels. */
export type RiskAnalysis = Record<string, RiskStats>;

export interface Stats {
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalProfit: number;
  averageProfit: number;
  intervalStats: Record<string, IntervalStats>;
  maxDrawdown: number;
  averageDrawdown: number;
  averagePnLPercentage: number;
  evaluationStats: EvaluationStats[];
  winRateWithBE: number;
  beWins: number;
  beLosses: number;
  currentStreak: number;
  maxWinningStreak: number;
  maxLosingStreak: number;
  averageDaysBetweenTrades: number;
  partialWinningTrades: number;
  partialLosingTrades: number;
  partialBETrades: number;
  totalPartialTradesCount: number;
  totalPartialsBECount: number;
  tradeQualityIndex: number;
  multipleR: number;
  }
