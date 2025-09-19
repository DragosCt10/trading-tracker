import { Session, User } from "@supabase/supabase-js";
import React from "react";

type RiskStats = {
  total: number;
  wins: number;
  losses: number;
  beWins: number;
  beLosses: number;
  winrate: number;
  winrateWithBE: number;
};

type RiskAnalysis = {
  risk03: RiskStats;
  risk05: RiskStats;
  risk07: RiskStats;
};

interface RiskPerTradeProps {
  allTradesRiskStats: RiskAnalysis | null;
  className?: string;
  userData: { user: User | null; session: Session | null; };
}

const RiskPerTrade: React.FC<RiskPerTradeProps> = ({ allTradesRiskStats, className = "", userData }) => {
  // Only show for specific user
  if (!userData?.user?.id || userData.user.id !== '40190650-9835-49df-aacb-b660c70c0d59') {
    return null;
  }
  const riskLevels = [
    {
      key: "risk03",
      label: "0.3% Risk",
    },
    {
      key: "risk05",
      label: "0.5% Risk",
    },
    {
      key: "risk07",
      label: "0.7% Risk",
    },
  ] as const;
  
  return (
    <div className={`col-span-3 bg-white border border-stone-200 rounded-lg shadow-sm p-6 ${className}`}>
      <h3 className="text-sm font-semibold text-stone-500 mb-3 flex items-center">
        Risk Per Trade
        <span className="ml-1 cursor-help group relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="absolute bottom-full -left-5 md:left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-white border border-stone-200 rounded-lg shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="text-xs sm:text-sm text-stone-700 space-y-1 sm:space-y-2">
              <div className="font-semibold text-stone-900 mb-1 sm:mb-2">Risk Per Trade</div>
              <p>
                Detailed breakdown of trades by risk percentage (0.3%, 0.5%, 0.7%) for the current year, showing wins, losses, and win rates for each risk level. Break-even (BE) trades are shown in parentheses.
              </p>
            </div>
          </div>
        </span>
      </h3>
      <div className="grid grid-cols-3 gap-6">
        {riskLevels.map(({ key, label }) => {
          const stats = allTradesRiskStats?.[key] || {
            total: 0,
            wins: 0,
            losses: 0,
            beWins: 0,
            beLosses: 0,
            winrate: 0,
            winrateWithBE: 0,
          };
          return (
            <div key={key} className="border border-stone-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-stone-900">{label}</h4>
                <span className="text-xs font-medium px-2 py-1 bg-stone-100 text-stone-600 rounded-full">
                  {stats.total} trades
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-stone-600">Wins</span>
                  <span className="text-sm font-medium text-green-600">
                    {stats.wins}
                    <span className="text-stone-400 text-xs ml-1">
                      ({stats.beWins} BE)
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-stone-600">Losses</span>
                  <span className="text-sm font-medium text-red-600">
                    {stats.losses}
                    <span className="text-stone-400 text-xs ml-1">
                      ({stats.beLosses} BE)
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-stone-100">
                  <span className="text-sm text-stone-600">Win Rate</span>
                  <span className="text-sm font-medium text-stone-900">
                    {stats.winrate?.toFixed(1) || "0"}%
                    <span className="text-stone-400 text-xs ml-1">
                      ({stats.winrateWithBE?.toFixed(1) || "0"}% w/BE)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskPerTrade;
