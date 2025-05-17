'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trade } from '@/types/trade';
import { useRouter } from 'next/navigation';
import { useTradingMode } from '@/context/TradingModeContext';
import { useUserDetails } from '@/hooks/useUserDetails';

// Add these constants at the top of the file after imports
const MARKET_OPTIONS = ['DAX', 'US30', 'UK100', 'US100', 'EURUSD', 'GBPUSD'];
const SETUP_OPTIONS = [
  'OG',
  'TG',
  'TCG',
  '3G',
  '3CG',
  'MultipleGaps',
  'SLG+OG',
  'SLG+TG',
  'SLG+TCG',
  'SLG+3G',
  'SLG+3CG'
];
const LIQUIDITY_OPTIONS = ['Liq. Majora', 'Liq. Minora', 'Liq. Locala', 'HOD', 'LOD'];
const MSS_OPTIONS = ['Normal', 'Agresiv'];
const EVALUATION_OPTIONS = ['A+', 'A', 'B', 'C'];
const DAY_OF_WEEK_OPTIONS = ['Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri'];
const QUARTER_OPTIONS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function NewTradeForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedProfit, setCalculatedProfit] = useState<number>(0);
  const { mode, activeAccount, isLoading: modeLoading } = useTradingMode();
  const { data: userDetails, isLoading } = useUserDetails();

  const NOTES_TEMPLATE = `📈 Setup:
  (Descrie setup-ul tehnic sau fundamental – de ce ai intrat în trade? Ce pattern, indicator sau logică ai urmat?)

  ✅ Plusuri:
  (Ce ai făcut bine? Ce a mers conform planului? A existat disciplină, răbdare, timing bun?)

  ❌ Minusuri:
  (Ce nu a mers? Ai intrat prea devreme/târziu? Ai ignorat ceva? Overtrading? FOMO?)

  🧠 Emoții:
  (Ce ai simțit în timpul trade-ului? Încredere? Frică? Nerăbdare? Calm? Ai fost influențat emoțional?)

  🎯 Lecții învățate:
  (Ce poți îmbunătăți? Ce vei face diferit data viitoare?)`;

  const initialTradeState: Trade = {
    trade_link: '',
    liquidity_taken: '',
    trade_time: '',
    trade_date: new Date().toISOString().split('T')[0],
    day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    market: '',
    setup_type: '',
    liquidity: '',
    sl_size: 0,
    direction: 'Long',
    trade_outcome: 'Win',
    break_even: false,
    reentry: false,
    news_related: false,
    mss: '',
    risk_reward_ratio: 0,
    risk_reward_ratio_long: 0,
    local_high_low: false,
    risk_per_trade: 0,
    calculated_profit: 0,
    mode: mode,
    notes: NOTES_TEMPLATE,
    pnl_percentage: 0,
    quarter: '',
    evaluation: '',
  };

  const [trade, setTrade] = useState<Trade>(initialTradeState);

  // Calculate profit based on risk percentage and account balance
  const calculateProfit = (riskPerTrade: number, outcome: 'Win' | 'Lose'): number => {
    if (!activeAccount?.account_balance) return 0;
    
    // Calculate risk amount based on account balance and risk percentage
    const riskAmount = (riskPerTrade / 100) * activeAccount.account_balance;
    
    // Get risk:reward ratio from trade or default to 2
    const riskRewardRatio = trade.risk_reward_ratio || 2;
    
    // Calculate profit based on outcome
    if (outcome === 'Win') {
      return riskAmount * riskRewardRatio;
    } else if (outcome === 'Lose') {
      return -riskAmount;
    }
    return 0;
  };

  // Update calculated profit when risk, outcome, or risk:reward ratio changes
  useEffect(() => {
    const profit = calculateProfit(trade.risk_per_trade, trade.trade_outcome);
    setCalculatedProfit(profit);
    setTrade(prev => ({ ...prev, calculated_profit: profit }));
  }, [trade.risk_per_trade, trade.trade_outcome, trade.risk_reward_ratio, activeAccount?.account_balance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate required selects
    if (!trade.market || !trade.setup_type || !trade.liquidity || !trade.mss) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    if (!activeAccount) {
      setError('No active account found. Please set up an account in settings.');
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();
      const tableName = `${mode}_trades`;

      // Calculate P&L percentage
      const pnlPercentage = activeAccount.account_balance 
        ? (calculatedProfit / activeAccount.account_balance) * 100 
        : 0;

      const { error } = await supabase
        .from(tableName)
        .insert([{ 
          ...trade,
          user_id: userDetails?.user?.id,
          calculated_profit: calculatedProfit,
          pnl_percentage: pnlPercentage,
          account_id: activeAccount.id
        }])
        .select();

      if (error) throw error;

      router.push('/trades');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (modeLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-stone-500"></div>
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg p-8 text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-12 w-12 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">No Active Account</h2>
          <p className="text-stone-600 mb-6">
            Please set up and activate an account for {mode} mode to view your trading dashboard.
          </p>
          <a
            href="/settings"
            className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
          >
            Go to Settings
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg max-w-4xl mx-auto">
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mb-6 bg-stone-100 border border-stone-200 text-stone-700 px-4 py-3 rounded">
        <p className="text-sm mt-1">You are adding a new trade for your <span className="font-medium underline">{activeAccount.name}</span> account in <span className="font-medium underline">{mode}</span> mode.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Trade Link</label>
          <div className="relative w-full">
            <input
              type="text"
              value={trade.trade_link}
              onChange={(e) => setTrade({ ...trade, trade_link: e.target.value })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Liquidity Taken</label>
          <div className="relative w-full">
            <input
              type="text"
              value={trade.liquidity_taken}
              onChange={(e) => setTrade({ ...trade, liquidity_taken: e.target.value })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Time</label>
          <div className="relative w-full">
            <input
              type="time"
              value={trade.trade_time}
              onChange={(e) => setTrade({ ...trade, trade_time: e.target.value })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Date</label>
          <div className="relative w-full">
            <input
              type="date"
              value={trade.trade_date}
              onChange={(e) => {
                const date = new Date(e.target.value);
                setTrade({
                  ...trade,
                  trade_date: e.target.value,
                  day_of_week: date.toLocaleDateString('en-US', { weekday: 'long' })
                });
              }}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Day of Week</label>
          <div className="relative w-full">
            <select
              value={trade.day_of_week}
              onChange={(e) => setTrade({ ...trade, day_of_week: e.target.value })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            >
              <option value="">Select Day of Week</option>
              {DAY_OF_WEEK_OPTIONS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Quarter</label>
          <div className="relative w-full">
            <select
              value={trade.quarter}
              onChange={(e) => setTrade({ ...trade, quarter: e.target.value })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            >
              <option value="">Select Quarter</option>
              {QUARTER_OPTIONS.map((quarter) => (
                <option key={quarter} value={quarter}>
                  {quarter}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Market</label>
          <div className="relative w-full">
            <select
              value={trade.market}
              onChange={(e) => setTrade({ ...trade, market: e.target.value })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            >
              <option value="">Select Market</option>
              {MARKET_OPTIONS.map((market) => (
                <option key={market} value={market}>
                  {market}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Setup Type</label>
          <div className="relative w-full">
            <select
              value={trade.setup_type}
              onChange={(e) => setTrade({ ...trade, setup_type: e.target.value })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            >
              <option value="">Select Setup Type</option>
              {SETUP_OPTIONS.map((setup) => (
                <option key={setup} value={setup}>
                  {setup}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Liquidity</label>
          <div className="relative w-full">
            <select
              value={trade.liquidity}
              onChange={(e) => setTrade({ ...trade, liquidity: e.target.value })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            >
              <option value="">Select Liquidity</option>
              {LIQUIDITY_OPTIONS.map((liquidity) => (
                <option key={liquidity} value={liquidity}>
                  {liquidity}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Stop Loss Size</label>
          <div className="relative w-full">
            <input
              type="number"
              step="0.01"
              value={trade.sl_size.toString()}
              onChange={(e) => setTrade({ ...trade, sl_size: parseFloat(e.target.value) || 0 })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Risk Per Trade (%)</label>
          <div className="relative w-full">
            <input
              type="number"
              step="0.01"
              value={trade.risk_per_trade.toString()}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setTrade({ ...trade, risk_per_trade: value || 0 });
              }}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Direction</label>
          <div className="relative w-full">
            <select
              value={trade.direction}
              onChange={(e) => setTrade({ ...trade, direction: e.target.value as 'Long' | 'Short' })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            >
              <option value="Long">Long</option>
              <option value="Short">Short</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Trade Outcome</label>
          <div className="relative w-full">
            <select
              value={trade.trade_outcome}
              onChange={(e) => setTrade({ ...trade, trade_outcome: e.target.value as 'Win' | 'Lose' })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            >
              <option value="Win">Win</option>
              <option value="Lose">Lose</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Risk/Reward Ratio</label>
          <div className="relative w-full">
            <input
              type="number"
              step="0.01"
              value={trade.risk_reward_ratio.toString()}
              onChange={(e) => setTrade({ ...trade, risk_reward_ratio: parseFloat(e.target.value) || 0 })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Potential Risk/Reward Ratio</label>
          <div className="relative w-full">
            <input
              type="number"
              step="0.01"
              value={trade.risk_reward_ratio_long.toString()}
              onChange={(e) => setTrade({ ...trade, risk_reward_ratio_long: parseFloat(e.target.value) || 0 })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">MSS</label>
          <div className="relative w-full">
            <select
              value={trade.mss}
              onChange={(e) => setTrade({ ...trade, mss: e.target.value })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            >
              <option value="">Select MSS Type</option>
              {MSS_OPTIONS.map((mss) => (
                <option key={mss} value={mss}>
                  {mss}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2 flex items-center">
            <span>Evaluation Grade</span>
            <span className="ml-1 cursor-help group relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute bottom-full -left-5 md:left-1/2 transform -translate-x-1/2 mb-2 w-72 sm:w-80 md:w-96 bg-white border border-stone-200 rounded-lg shadow-lg p-3 sm:p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="text-xs sm:text-sm text-stone-700 space-y-1 sm:space-y-2">
                  <div className="font-semibold text-stone-900 mb-1 sm:mb-2">Evaluation Grade Guide</div>
                  <div className="bg-blue-50 border-blue-200 border rounded p-1.5 sm:p-2">
                    <span className="font-medium">A+</span> — Perfect execution. Followed all rules, optimal risk management.
                  </div>
                  <div className="bg-green-50 border-green-200 border rounded p-1.5 sm:p-2">
                    <span className="font-medium">A</span> — Excellent trade. Minor deviations from plan but overall strong execution.
                  </div>
                  <div className="bg-yellow-50 border-yellow-200 border rounded p-1.5 sm:p-2">
                    <span className="font-medium">B</span> — Good trade. Some rule violations but managed well. Room for improvement.
                  </div>
                  <div className="bg-orange-50 border-orange-200 border rounded p-1.5 sm:p-2">
                    <span className="font-medium">C</span> — Poor execution. Rules violations.
                  </div>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-stone-200 transform rotate-45"></div>
              </div>
            </span>
          </label>
          <div className="relative w-full">
            <select
              value={trade.evaluation}
              onChange={(e) => setTrade({ ...trade, evaluation: e.target.value })}
              className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800  placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
              required
            >
              <option value="">Select Grade</option>
              {EVALUATION_OPTIONS.map((evaluation) => (
                <option key={evaluation} value={evaluation}>
                  {evaluation}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-stone-700 mb-2">Notes</label>
          <textarea
            value={trade.notes}
            onChange={(e) => setTrade({ ...trade, notes: e.target.value })}
            className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800 placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
            rows={16}
            placeholder={'Add any notes about this trade...'}
          />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Break Even Checkbox */}
          <div className="inline-flex items-center">
            <label className="flex items-center cursor-pointer relative" htmlFor="break-even-checkbox">
              <input
                type="checkbox"
                id="break-even-checkbox"
                checked={trade.break_even}
                onChange={(e) => setTrade({ ...trade, break_even: e.target.checked })}
                className="peer h-5 w-5 cursor-pointer transition-all appearance-none rounded shadow-sm hover:shadow border border-stone-200 checked:bg-stone-800 checked:border-stone-800"
              />
              <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <svg strokeWidth="1.5" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#ffffff">
                  <path d="M5 13L9 17L19 7" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </span>
            </label>
            <label className="cursor-pointer ml-2 text-stone-800 text-sm" htmlFor="break-even-checkbox">Break Even</label>
          </div>
          {/* Re-entry Checkbox */}
          <div className="inline-flex items-center">
            <label className="flex items-center cursor-pointer relative" htmlFor="reentry-checkbox">
              <input
                type="checkbox"
                id="reentry-checkbox"
                checked={trade.reentry}
                onChange={(e) => setTrade({ ...trade, reentry: e.target.checked })}
                className="peer h-5 w-5 cursor-pointer transition-all appearance-none rounded shadow-sm hover:shadow border border-stone-200 checked:bg-stone-800 checked:border-stone-800"
              />
              <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <svg strokeWidth="1.5" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#ffffff">
                  <path d="M5 13L9 17L19 7" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </span>
            </label>
            <label className="cursor-pointer ml-2 text-stone-800 text-sm" htmlFor="reentry-checkbox">Re-entry</label>
          </div>
          {/* News Related Checkbox */}
          <div className="inline-flex items-center">
            <label className="flex items-center cursor-pointer relative" htmlFor="news-checkbox">
              <input
                type="checkbox"
                id="news-checkbox"
                checked={trade.news_related}
                onChange={(e) => setTrade({ ...trade, news_related: e.target.checked })}
                className="peer h-5 w-5 cursor-pointer transition-all appearance-none rounded shadow-sm hover:shadow border border-stone-200 checked:bg-stone-800 checked:border-stone-800"
              />
              <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <svg strokeWidth="1.5" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#ffffff">
                  <path d="M5 13L9 17L19 7" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </span>
            </label>
            <label className="cursor-pointer ml-2 text-stone-800 text-sm" htmlFor="news-checkbox">News Related</label>
          </div>
          {/* Local High/Low Checkbox */}
          <div className="inline-flex items-center">
            <label className="flex items-center cursor-pointer relative" htmlFor="localhl-checkbox">
              <input
                type="checkbox"
                id="localhl-checkbox"
                checked={trade.local_high_low}
                onChange={(e) => setTrade({ ...trade, local_high_low: e.target.checked })}
                className="peer h-5 w-5 cursor-pointer transition-all appearance-none rounded shadow-sm hover:shadow border border-stone-200 checked:bg-stone-800 checked:border-stone-800"
              />
              <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <svg strokeWidth="1.5" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#ffffff">
                  <path d="M5 13L9 17L19 7" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </span>
            </label>
            <label className="cursor-pointer ml-2 text-stone-800 text-sm" htmlFor="localhl-checkbox">Local High/Low</label>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              Account Balance ({activeAccount.currency}): <span className="font-medium text-stone-800">
                {activeAccount.currency === 'EUR' ? '€' : '$'}{activeAccount.account_balance.toFixed(2)}
              </span>
            </div>
            <div>
              P&L: <span className={`font-medium ${calculatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {activeAccount.currency === 'EUR' ? '€' : '$'}{calculatedProfit.toFixed(2)}
              </span>
            </div>
            <div>
              P&L %: <span className={`font-medium ${calculatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {activeAccount.account_balance ? ((calculatedProfit / activeAccount.account_balance) * 100).toFixed(2) : '0.00'}%
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/trades')}
              className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md bg-transparent relative text-stone-700 hover:text-stone-700 border-stone-500 hover:bg-transparent duration-150 hover:border-stone-600 rounded-lg hover:opacity-60 hover:shadow-none"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
            >
              {isSubmitting ? 'Saving...' : 'Save Trade'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
} 