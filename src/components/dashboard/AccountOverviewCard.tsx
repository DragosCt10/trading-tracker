'use client';

import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip as ReTooltip, Bar as ReBar, Cell, LabelList } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface MonthlyStats {
  [month: string]: {
    profit: number;
  };
}

interface AccountOverviewCardProps {
  accountName: string | null;
  currencySymbol: string;
  updatedBalance: number;
  totalYearProfit: number;
  accountBalance: number;
  months: string[];
  monthlyStatsAllTrades: MonthlyStats;
}

export function AccountOverviewCard({
  accountName,
  currencySymbol,
  updatedBalance,
  totalYearProfit,
  accountBalance,
  months,
  monthlyStatsAllTrades,
}: AccountOverviewCardProps) {
  return (
    <Card className="mb-8 p-6 border shadow-none">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <CardTitle className="text-xl font-semibold text-slate-800">
            {accountName || 'No Active Account'}
          </CardTitle>
          <p className="text-sm text-slate-500">Current Balance</p>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-500">Balance incl. year profit</div>
          <div className="text-2xl font-semibold text-slate-800">
            {currencySymbol}
            {updatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div
            className={`text-sm font-semibold ${
              totalYearProfit >= 0 ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {totalYearProfit >= 0 ? '+' : ''}
            {((totalYearProfit / (accountBalance || 1)) * 100).toFixed(2)}% YTD
          </div>
        </div>
      </div>

      {/* Chart */}
      <CardContent className="h-64 mb-2 relative p-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={months.map((month) => ({
              month,
              profit: monthlyStatsAllTrades[month]?.profit ?? 0,
              profitPercent: monthlyStatsAllTrades[month]
                ? Number(
                    (
                      (monthlyStatsAllTrades[month].profit /
                        (accountBalance || 1)) *
                      100
                    ).toFixed(2)
                  )
                : 0,
            }))}
            margin={{ top: 30, right: 10, left: 0, bottom: 0 }}
            >
            <XAxis
              dataKey="month"
              tick={{ fill: '#64748b', fontSize: 14}} // text-slate-500
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 14 }} // text-slate-500
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                `${currencySymbol}${v.toLocaleString('en-US', {
                  maximumFractionDigits: 0,
                })}`
              }
            />
            {/* Custom tooltip using shadcn with slate styles */}
            <ReTooltip
              contentStyle={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: 8, padding: '12px 16px', color: '#1e293b', fontSize: 14 }} // Tailwind slate-200 border, slate-800 text
              wrapperStyle={{ outline: 'none' }}
              cursor={false}
              formatter={(value: number) =>
                <span className="text-slate-800 font-semibold">
                  {currencySymbol}
                  {value.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              }
              labelStyle={{ color: '#64748b', fontWeight: 400, fontSize: 14 }}
            />

            <ReBar dataKey="profit" radius={[4, 4, 4, 4]} barSize={32}>
              {months.map((month) => (
                <Cell
                  key={month}
                  fill={
                    (monthlyStatsAllTrades[month]?.profit ?? 0) >= 0
                      ? '#34d399' // emerald-400
                      : '#f87171' // red-400
                  }
                />
              ))}

              <LabelList
                dataKey="profitPercent"
                content={(props: any) => {
                  if (!props || props.value == null) return null;

                  const value = Number(props.value);
                  const x = Number(props.x || 0);
                  const y = Number(props.y || 0);
                  const width = Number(props.width);
                  const height = Number(props.height);
                  const yPos = value >= 0 ? y - 5 : y + height - 5;

                  return (
                    <text
                      x={x + width / 2}
                      y={yPos}
                      fill="#1e293b" // slate-800
                      textAnchor="middle"
                      className="text-xs font-medium"
                    >
                      {`${value}%`}
                    </text>
                  );
                }}
              />
            </ReBar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
