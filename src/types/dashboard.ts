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
}

export interface BaseStats {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  winRateWithBE: number;
  beWins: number;
  beLosses: number;
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
  nonBeWins: number;
  nonBeLosses: number;
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
    winsWithBE: number;
    lossesWithBE: number;
    winRateWithBE: number;
  }
}

export interface IntervalStats {
  label: string;
  wins: number;
  losses: number;
  beWins: number;
  beLosses: number;
  winRate: number;
  winRateWithBE: number;
}

export interface Stats {
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalProfit: number;
  averageProfit: number;
  intervalStats: Record<string, IntervalStats>;
  maxDrawdown: number;
  averagePnLPercentage: number;
  evaluationStats: EvaluationStats[];
  winRateWithBE: number;
  beWins: number;
  beLosses: number;
  currentStreak: number;
  maxWinningStreak: number;
  maxLosingStreak: number;
}
