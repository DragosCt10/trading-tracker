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