import { Session, User } from "@supabase/supabase-js";
import React from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"; // Assumes shadcn card exports
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

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
  userData: { user: User | null; session: Session | null };
}

const RiskPerTrade: React.FC<RiskPerTradeProps> = ({
  allTradesRiskStats,
  className = "",
  userData,
}) => {
  // Only show for specific user
  if (
    !userData?.user?.id ||
    userData.user.id !== "40190650-9835-49df-aacb-b660c70c0d59"
  ) {
    return null;
  }

  const riskLevels = [
    {
      key: "risk03",
      label: "0.35% Risk",
      tooltip:
        "Trades risking 0.35% of account. Shows total wins (with break-evens in parentheses), losses (with break-evens), and win rates.",
    },
    {
      key: "risk05",
      label: "0.5% Risk",
      tooltip:
        "Trades risking 0.5% of account. Shows total wins (with break-evens in parentheses), losses (with break-evens), and win rates.",
    },
    {
      key: "risk07",
      label: "0.7% Risk",
      tooltip:
        "Trades risking 0.7% of account. Shows total wins (with break-evens in parentheses), losses (with break-evens), and win rates.",
    },
  ] as const;

  return (
    <Card className={`col-span-3 shadow-none border ${className}`}>
      <CardHeader className="flex-row gap-2 items-center">
        <CardTitle>
          <div className="flex items-center text-lg font-semibold text-slate-800">
            Risk Per Trade
            <span className="ml-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="p-0 m-0 bg-transparent border-0 align-middle leading-none outline-none focus:ring-0"
                      tabIndex={0}
                      aria-label="Risk Per Trade Info"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="w-72 text-sm bg-white border p-4"
                    sideOffset={6}
                  >
                    <div className="font-semibold text-slate-800 mb-2">
                      Risk Per Trade
                    </div>
                    <p className="text-slate-500">
                      Detailed breakdown of trades by risk percentage (0.35%, 0.5%, 0.7%) for the current year, showing wins, losses, and win rates for each risk level. Break-even (BE) trades are shown in parentheses.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {riskLevels.map(({ key, label, tooltip }) => {
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
              <Card
                key={key}
                className="border bg-slate-50/60 p-4 flex flex-col justify-between shadow-none"
              >
                <div className="flex items-center justify-between mb-2">
                  <CardDescription>
                    <div className="flex items-center gap-1">
                      <h4 className="text-sm font-semibold text-slate-800">
                        {label}
                      </h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="p-0 m-0 bg-transparent border-0 align-middle leading-none outline-none focus:ring-0"
                              tabIndex={0}
                              aria-label={`${label} Info`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-[15px] w-[15px] text-slate-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="start"
                            className="w-72 text-sm bg-white text-slate-500 border p-4"
                            sideOffset={6}
                          >
                            {tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardDescription>
                  <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {stats.total} trades
                  </span>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Wins
                    </span>
                    <span className="text-sm font-medium text-emerald-500">
                      {stats.wins}
                      <span className="text-slate-500 text-xs ml-1">
                        ({stats.beWins} BE)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Losses
                    </span>
                    <span className="text-sm font-medium text-red-500">
                      {stats.losses}
                      <span className="text-slate-500 text-xs ml-1">
                        ({stats.beLosses} BE)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-slate-200">
                    <span className="text-sm text-slate-500">
                      Win Rate
                    </span>
                    <span className="text-sm font-medium text-slate-800">
                      {typeof stats.winrate === "number"
                        ? stats.winrate.toFixed(1)
                        : "0"}
                      %
                      <span className="text-slate-500 text-xs ml-1">
                        (
                        {typeof stats.winrateWithBE === "number"
                          ? stats.winrateWithBE.toFixed(1)
                          : "0"}
                        % w/BE)
                      </span>
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskPerTrade;
