'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar as ReBar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

const slate500 = '#64748b'; // tailwind slate-500

// Generic shape for each bar/category
export interface TradeStatDatum {
  category: string;        // label shown on X axis
  totalTrades?: number;    // optional "(x trades)" info
  wins?: number;
  losses?: number;
  beWins?: number;
  beLosses?: number;
  winRate?: number;        // 0–100
  winRateWithBE?: number;  // 0–100
  value?: number;          // generic value (e.g. SL size)
  // Flexible for chart data that does not supply all above (e.g. just `category` and `value`)
}

type Mode = 'winsLossesWinRate' | 'singleValue';

interface TradeStatsBarCardProps {
  title: string;
  description: string;
  data: TradeStatDatum[];
  mode?: Mode;
  /** used only when mode === 'singleValue' */
  valueKey?: keyof TradeStatDatum;
  /** tailwind height for the chart container (default h-80; ignored) */
  heightClassName?: string;
}

export function TradeStatsBarCard({
  title,
  description,
  data,
  mode = 'winsLossesWinRate',
  valueKey = 'value',
  heightClassName, // ignored for height consistency
}: TradeStatsBarCardProps) {
  // "No Trades" fallback must support partial objects
  // If mode === 'winsLossesWinRate', require at least one of wins/losses/beWins/beLosses/totalTrades to be > 0
  // If mode === 'singleValue', require at least one data point with a defined and finite value in valueKey
  const onlyZero = !data || data.length === 0 ||
    (
      mode === 'winsLossesWinRate'
        ? data.every(
            (d) =>
              (d.totalTrades ?? 0) === 0 &&
              (d.wins ?? 0) === 0 &&
              (d.losses ?? 0) === 0 &&
              (d.beWins ?? 0) === 0 &&
              (d.beLosses ?? 0) === 0
          )
        : mode === 'singleValue'
        ? data.every(
            (d) =>
              d[valueKey] === undefined ||
              d[valueKey] === null ||
              isNaN(Number(d[valueKey])) ||
              !isFinite(Number(d[valueKey]))
          )
        : true
    );

  if (onlyZero) {
    return (
      <Card className="border shadow-none bg-white h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold text-slate-800 mb-1">
            {title}
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex justify-center items-center">
          <div className="flex flex-col justify-center items-center w-full h-full">
            <div className="text-base font-medium text-slate-500 text-center mb-1">
              No trades found
            </div>
            <div className="text-sm text-slate-400 text-center max-w-xs">
              There are no trades to display for this category yet. Start trading to see your statistics here!
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Common helpers -------------------------------------------------------

  const withTotals: TradeStatDatum[] = data.map((d) => ({
    ...d,
    totalTrades:
      d.totalTrades ?? (((d.wins ?? 0) + (d.losses ?? 0)) || undefined),
  }));

  const maxWinsLosses =
    mode === 'winsLossesWinRate'
      ? Math.max(
          ...withTotals.map((d) => Math.max(d.wins ?? 0, d.losses ?? 0)),
          1,
        )
      : Math.max(
          ...withTotals.map((d) => Number(d[valueKey] ?? 0)),
          1,
        );

  const yAxisTickFormatter = (value: number) =>
    Number(value ?? 0).toLocaleString('en-US', {
      maximumFractionDigits: mode === 'singleValue' ? 2 : 0,
    });

  // --- Tooltip renderers ----------------------------------------------------

  const StatsTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const d = payload[0].payload as TradeStatDatum;

    if (mode === 'singleValue') {
      const v = Number(d[valueKey] ?? 0);
      return (
        <div className="rounded-lg shadow bg-white p-3 border border-slate-200 text-[13px] leading-snug min-w-[160px]">
          <div className="font-semibold mb-1 text-slate-800 text-[15px]">
            {d.category}
          </div>
          <div className="text-slate-500">
            Value:{' '}
            <span className="font-semibold text-slate-700">
              {v.toFixed(2)}
            </span>
          </div>
        </div>
      );
    }

    const wins = d.wins ?? 0;
    const losses = d.losses ?? 0;
    const beWins = d.beWins ?? 0;
    const beLosses = d.beLosses ?? 0;
    const winRate = d.winRate ?? 0;
    const winRateWithBE = d.winRateWithBE ?? d.winRate ?? 0;

    return (
      <div className="rounded-lg shadow bg-white p-3 border border-slate-200 text-[13px] leading-snug min-w-[180px]">
        <div className="font-semibold mb-1 text-slate-800 text-[15px]">
          {d.category} 
          {typeof d.totalTrades === 'number'
            ? ` (${d.totalTrades} trade${d.totalTrades === 1 ? '' : 's'})`
            : ''}
        </div>
        <div className="text-slate-500">
          Wins:{' '}
          <span className="font-semibold text-emerald-600">{wins}</span>
          {d.beWins !== undefined && (
            <>
              {' '}
              (<span className="font-semibold text-slate-700">{beWins}</span>{' '}
              BE)
            </>
          )}
        </div>
        <div className="text-slate-500">
          Losses:{' '}
          <span className="font-semibold text-red-500">{losses}</span>
          {d.beLosses !== undefined && (
            <>
              {' '}
              (<span className="font-semibold text-slate-700">{beLosses}</span>{' '}
              BE)
            </>
          )}
        </div>
        <div className="text-slate-500 mt-1">
          Win Rate:{' '}
          <span className="font-semibold text-amber-600">
            {winRate.toFixed(2)}%
          </span>
          {d.winRateWithBE !== undefined && (
            <>
              {' '}
              ({winRateWithBE.toFixed(2)}% w/ BE)
            </>
          )}
        </div>
      </div>
    );
  };

  // --- X axis tick with (n) count like MonthlyPerformanceChart ----
  const renderXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const d = withTotals[payload?.index ?? 0];
    if (!d) return null;

    // Always show (n) for count, just like the referenced chart
    const label = typeof d.totalTrades === 'number'
      ? `${d.category} (${d.totalTrades})`
      : d.category;

    return (
      <text
        x={x}
        y={y}
        dy={16}
        textAnchor="middle"
        fill={slate500}
        fontSize={12}
      >
        {label}
      </text>
    );
  };

  // --- Render (use identical height + structure as MonthlyPerformanceChart) ---

  return (
    <Card className="border shadow-none h-96 flex flex-col bg-white">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold text-slate-800 mb-1">
          {title}
        </CardTitle>
        <CardDescription className="text-sm text-slate-500 mb-3">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex items-center">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={withTotals}
              layout="horizontal"
              margin={{ top: 10, right: 24, left: 16, bottom: 48 }}
              barCategoryGap="30%"
            >
              <XAxis
                dataKey="category"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={renderXAxisTick as any}
              />
              <YAxis
                type="number"
                tick={{ fill: slate500, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yAxisTickFormatter}
                domain={[0, Math.ceil(maxWinsLosses * 1.12)]}
                label={{
                  value: mode === 'singleValue' ? 'Value' : 'Wins / Losses',
                  angle: -90,
                  position: 'middle',
                  fill: slate500,
                  fontSize: 13,
                  fontWeight: 500,
                  dy: -10,
                  dx: -10
                }}
              />

              {/* hidden secondary axis so winRate doesn't affect scaling */}
              {mode === 'winsLossesWinRate' && (
                <YAxis yAxisId={1} hide domain={[0, 100]} />
              )}

              <ReTooltip
                content={<StatsTooltip />}
                cursor={false}
                wrapperStyle={{ outline: 'none' }}
              />

              {mode === 'winsLossesWinRate' ? (
                <>
                  <ReBar
                    dataKey="wins"
                    name="Wins"
                    fill="rgba(52,211,153,0.8)" // emerald-400
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <ReBar
                    dataKey="losses"
                    name="Losses"
                    fill="rgba(248,113,113,0.8)" // red-400
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <ReBar
                    dataKey="winRate"
                    name="Win Rate"
                    fill="rgba(253,186,116,0.8)" // orange-300
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                    yAxisId={1}
                  />
                </>
              ) : (
                <ReBar
                  dataKey={valueKey as string}
                  name="Value"
                  fill="rgba(148,163,184,0.4)" // slate-400-ish (like stone-200)
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
