'use client';

import { TradeStatDatum, TradeStatsBarCard } from "./TradesStatsBarCard";

interface EvaluationStats {
  grade: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  winRateWithBE: number;
  beWins: number;
  beLosses: number;
}

interface EvaluationStatsProps {
  stats: EvaluationStats[];
}

const GRADE_ORDER = ['A+', 'A', 'B', 'C'];

export function EvaluationStats({ stats }: EvaluationStatsProps) {
  // Filter out "Not Evaluated" and sort by grade order
  const filtered = stats
    .filter((stat) => GRADE_ORDER.includes(stat.grade))
    .sort(
      (a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade),
    );

  const chartData: TradeStatDatum[] = filtered.map((stat) => ({
    category: `${stat.grade}`,
    wins: stat.wins,
    losses: stat.losses,
    beWins: stat.beWins,
    beLosses: stat.beLosses,
    winRate: stat.winRate,
    winRateWithBE: stat.winRateWithBE,
    totalTrades: stat.total,
  }));

  return (
    <TradeStatsBarCard
      title="Evaluation Grade Statistics"
      description="Distribution of evaluation trades by grade."
      data={chartData}
      mode="winsLossesWinRate"
      heightClassName="h-80"
    />
  );
}
