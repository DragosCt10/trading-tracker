'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { createTrade } from '@/lib/server/trades';
import { Trade } from '@/types/trade';
import { useQueryClient } from '@tanstack/react-query';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useStrategies } from '@/hooks/useStrategies';
import { PlusCircle } from 'lucide-react';

// shadcn/ui
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Info, AlertCircle, X, Calendar } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { getMarketValidationError, normalizeMarket } from '@/utils/validateMarket';
import { calculateTradePnl } from '@/utils/helpers/tradePnlCalculator';
import { MarketCombobox } from '@/components/MarketCombobox';
import { ALLOWED_MARKETS } from '@/constants/allowedMarkets';
import { TIME_INTERVALS, getIntervalForTime } from '@/constants/analytics';

/** Kept for any legacy reference; market input uses MarketCombobox + ALLOWED_MARKETS. */
const MARKET_OPTIONS = ALLOWED_MARKETS;

const SETUP_OPTIONS = [
  'OG', 'TG', 'TCG', '3G', '3CG', 'MultipleGaps',
  'SLG+OG', 'SLG+TG', 'SLG+TCG', 'SLG+3G', 'SLG+3CG'
];
const LIQUIDITY_OPTIONS = ['Major Liquidity', 'Low Liquidity', 'Local Liquidity', 'HOD', 'LOD'];
const MSS_OPTIONS = ['Normal', 'Aggressive'];
const EVALUATION_OPTIONS = ['A+', 'A', 'B', 'C'];

// FVG Size: preset list 0.5, 1, 1.5, 2, 2.5, 3 (0.5 steps). Custom (3+) for 3.5, 4, 4.5, ...
const FVG_SIZE_OPTIONS: { value: number; label: string }[] = [
  { value: 0.5, label: '0.5' },
  { value: 1, label: '1' },
  { value: 1.5, label: '1.5' },
  { value: 2, label: '2' },
  { value: 2.5, label: '2.5' },
  { value: 3, label: '3' },
];
const FVG_SIZE_PRESET_VALUES = [0.5, 1, 1.5, 2, 2.5, 3];
const FVG_SIZE_CUSTOM_MIN = 3.5; // Custom (3+) values: 3.5, 4, 4.5, ...
const FVG_SIZE_NONE = '__none__';
function snapToHalfStep(num: number): number {
  return Math.round(num * 2) / 2;
}

// Potential Risk:Reward Ratio: 1 to 10 in 0.5 steps, plus 10+
const POTENTIAL_RR_OPTIONS: { value: number; label: string }[] = [
  ...Array.from({ length: 19 }, (_, i) => {
    const v = 1 + i * 0.5;
    return { value: v, label: String(v) };
  }),
  { value: 10.5, label: '10+' },
];

const WEEKDAY_MAP: Record<string, string> = {
  Monday: 'Monday', Tuesday: 'Tuesday', Wednesday: 'Wednesday', Thursday: 'Thursday',
  Friday: 'Friday', Saturday: 'Saturday', Sunday: 'Sunday',
};

function getQuarter(dateStr: string): string {
  const m = new Date(dateStr).getMonth() + 1;
  if (m <= 3) return 'Q1';
  if (m <= 6) return 'Q2';
  if (m <= 9) return 'Q3';
  return 'Q4';
}

const NOTES_TEMPLATE = `📈 Setup:
(Describe the technical or fundamental setup – why did you enter the trade? What pattern, indicator or logic did you follow?)

✅ Positives:
(What did you do well? What went according to plan? Was there discipline, patience, good timing?)

❌ Negatives:
(What didn't work? Did you enter too early/late? Did you ignore something? Overtrading? FOMO?)

🎯 Lessons learned:
(What can you improve? What will you do differently next time?)`;

/** Old Romanian template – used to migrate saved drafts to the new English template */
const NOTES_TEMPLATE_LEGACY_RO = `📈 Setup:
(Descrie setup-ul tehnic sau fundamental – de ce ai intrat în trade? Ce pattern, indicator sau logică ai urmat?)

✅ Plusuri:
(Ce ai făcut bine? Ce a mers conform planului? A existat disciplină, răbdare, timing bun?)

❌ Minusuri:
(Ce nu a mers? Ai intrat prea devreme/târziu? Ai ignorat ceva? Overtrading? FOMO?)

🎯 Lecții învățate:
(Ce poți îmbunătăți? Ce vei face diferit data viitoare?)`;

interface NewTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTradeCreated?: () => void;
}

export default function NewTradeModal({ isOpen, onClose, onTradeCreated }: NewTradeModalProps) {
  const params = useParams();
  const { selection } = useActionBarSelection();
  const { data: userData } = useUserDetails();
  const userId = userData?.user?.id;
  const { strategies } = useStrategies({ userId });
  const queryClient = useQueryClient();
  
  // Get strategy slug from URL params – institutional-only fields shown only for trading-institutional
  const strategySlug = params?.strategy as string | undefined;
  const isTradingInstitutional = strategySlug === 'trading-institutional';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [progressDialog, setProgressDialog] = useState<{
    open: boolean;
    status: 'loading' | 'success' | 'error';
    message: string;
  }>({ open: false, status: 'loading', message: '' });

  // Prevent hydration mismatch by only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const initialTradeState: Trade = {
    trade_link: '',
    liquidity_taken: '',
    trade_time: '',
    trade_date: new Date().toISOString().split('T')[0],
    day_of_week: WEEKDAY_MAP[new Date().toLocaleDateString('en-US', { weekday: 'long' })],
    market: '',
    setup_type: '',
    liquidity: '',
    sl_size: undefined as any,
    direction: '' as 'Long' | 'Short',
    trade_outcome: '' as 'Win' | 'Lose',
    be_final_result: null as string | null,
    break_even: false,
    reentry: false,
    news_related: false,
    mss: '',
    risk_per_trade: undefined as any,
    risk_reward_ratio: undefined as any,
    risk_reward_ratio_long: undefined as any,
    local_high_low: false,
    mode: selection.mode,
    notes: NOTES_TEMPLATE,
    quarter: '',
    evaluation: '',
    partials_taken: false,
    executed: true,
    launch_hour: false,
    displacement_size: undefined as any,
    strategy_id: null,
    trend: '',
    fvg_size: undefined as any,
    confidence_at_entry: null as number | null,
    mind_state_at_entry: 3, // Preselect Neutral so user sees the scale (1–5) like Confidence
  };

  const [trade, setTrade] = useState<Trade>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`new-trade-draft-${selection.mode}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const dateStr = parsed.trade_date || new Date().toISOString().split('T')[0];
          // Migrate notes: legacy RO → English; any notes with old "🧠 Emotions:" section → new template without it
          let notes = parsed.notes === NOTES_TEMPLATE_LEGACY_RO ? NOTES_TEMPLATE : (parsed.notes ?? initialTradeState.notes);
          if (notes && notes.includes('🧠 Emotions:')) {
            notes = NOTES_TEMPLATE;
          }
          // Normalize legacy trade_time (e.g. "09:30") to interval start (e.g. "08:00") so interval Select and TimeIntervalStatisticsCard both work
          const rawTime = parsed.trade_time || '';
          const intervalForTime = rawTime ? getIntervalForTime(rawTime) : null;
          const tradeTime = intervalForTime ? intervalForTime.start : rawTime;

          return {
            ...initialTradeState,
            ...parsed,
            trade_date: dateStr,
            trade_time: tradeTime,
            day_of_week:
              parsed.day_of_week ||
              WEEKDAY_MAP[new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' })],
            quarter: parsed.quarter || getQuarter(dateStr),
            notes,
            mind_state_at_entry: parsed.mind_state_at_entry ?? 3, // Preselect 3 (Neutral) when missing so scale is clear
          };
        } catch { }
      }
    }
    return initialTradeState;
  });

  // Automatically set strategy_id from URL slug when modal opens or slug/strategies change
  useEffect(() => {
    if (isOpen && strategySlug && strategies.length > 0) {
      // Decode the strategy slug (URL-encoded)
      const decodedSlug = decodeURIComponent(strategySlug);
      // Find strategy by slug
      const strategy = strategies.find((s) => s.slug === decodedSlug);
      if (strategy && trade.strategy_id !== strategy.id) {
        setTrade((prev) => ({ ...prev, strategy_id: strategy.id }));
      }
    }
  }, [isOpen, strategySlug, strategies, trade.strategy_id]);

  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  const updateTrade = <K extends keyof Trade>(key: K, value: Trade[K]) => {
    setTrade((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  };

  // Helper function to invalidate and refetch ALL queries (ensures analytics updates)
  const invalidateAndRefetchTradeQueries = async () => {
    // Signal strategy page to skip re-hydrating from stale initialData (so calendar/list show new trade)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('trade-data-invalidated', Date.now().toString());
    }
    
    // Get current context for explicit refetch
    const mode = selection.mode;
    const accountId = selection.activeAccount?.id;
    const strategyId = trade.strategy_id;
    
    // Invalidate all trade-related queries (marks as stale but keeps them so refetch works)
    await queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey;
      if (!Array.isArray(key)) return false;
      const firstKey = key[0];
      return (
        firstKey === 'allTrades' ||
        firstKey === 'filteredTrades' ||
        firstKey === 'nonExecutedTrades' ||
        firstKey === 'discoverTrades' ||
        firstKey === 'all-strategy-trades' ||
        firstKey === 'all-strategy-stats'
      );
    }});
    
    // Explicitly refetch queries for the current strategy (ensures calendar updates immediately)
    // This is critical: we refetch BEFORE any removeQueries so the queries still exist
    if (accountId && userId && strategyId) {
      await queryClient.refetchQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          if (!Array.isArray(key)) return false;
          const firstKey = key[0];
          // Match trade queries for current strategy
          if (firstKey === 'allTrades' || firstKey === 'filteredTrades' || firstKey === 'nonExecutedTrades') {
            // Check if query matches current mode, account, user, and strategy
            // allTrades: ['allTrades', mode, accountId, userId, year, strategyId] - strategyId at index 5
            // filteredTrades: ['filteredTrades', mode, accountId, userId, viewMode, startDate, endDate, strategyId] - strategyId at index 7
            // nonExecutedTrades: same structure as filteredTrades - strategyId at index 7
            const matchesMode = key[1] === mode;
            const matchesAccount = key[2] === accountId;
            const matchesUser = key[3] === userId;
            // Strategy ID is at index 5 for allTrades, index 7 for filteredTrades/nonExecutedTrades
            let matchesStrategy = false;
            if (firstKey === 'allTrades' && key.length > 5) {
              matchesStrategy = key[5] === strategyId;
            } else if ((firstKey === 'filteredTrades' || firstKey === 'nonExecutedTrades') && key.length > 7) {
              matchesStrategy = key[7] === strategyId;
            }
            return matchesMode && matchesAccount && matchesUser && matchesStrategy;
          }
          return false;
        }
      });
    }
    
    // Also refetch any other active queries to catch edge cases
    await queryClient.refetchQueries({ type: 'active' });
  };

  // keep weekday + quarter in sync when the committed date changes
  useEffect(() => {
    const dateStr = trade.trade_date;
    const dt = new Date(dateStr);
    const engDay = dt.toLocaleDateString('en-US', { weekday: 'long' });
    const roDay = WEEKDAY_MAP[engDay] ?? engDay;
    setTrade((prev) => {
      const next = { ...prev, day_of_week: roDay, quarter: getQuarter(dateStr) };
      return prev.day_of_week === next.day_of_week && prev.quarter === next.quarter ? prev : next;
    });
  }, [trade.trade_date]);

  // When outcome is Lose or BE, set Potential R:R to 0 (not editable)
  useEffect(() => {
    if ((trade.trade_outcome === 'Lose' || trade.trade_outcome === 'BE') && trade.risk_reward_ratio_long !== 0) {
      setTrade((prev) => ({ ...prev, risk_reward_ratio_long: 0 as any }));
    }
  }, [trade.trade_outcome, trade.risk_reward_ratio_long]);

  // -------- Derived calculations --------
  const accountBalance = selection.activeAccount?.account_balance ?? 0;
  const currency = selection.activeAccount?.currency === 'EUR' ? '€' : '$';

  const { pnl_percentage: pnlPercentage, calculated_profit: signedProfit } = useMemo(
    () => calculateTradePnl(trade, accountBalance),
    [accountBalance, trade.break_even, trade.trade_outcome, trade.risk_per_trade, trade.risk_reward_ratio]
  );

  // Save trade draft to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`new-trade-draft-${selection.mode}`, JSON.stringify(trade));
    } catch { }
  }, [trade, selection.mode]);

  // Auto-dismiss error after 3 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(t);
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const marketError = getMarketValidationError(trade.market);
    if (marketError || !trade.trade_time) {
      setError(marketError || 'Please fill in all required fields (including Trade Time).');
      return;
    }
    if (!trade.direction || !trade.trade_outcome) {
      setError('Please select Direction and Trade Outcome.');
      return;
    }
    if (isTradingInstitutional && (!trade.setup_type || !trade.liquidity || !trade.mss || !trade.sl_size)) {
      setError('Please fill in all required fields (Setup Type, Liquidity, MSS, SL Size).');
      return;
    }

    if (!trade.strategy_id) {
      setError('Strategy not found. Please navigate to a valid strategy page.');
      return;
    }

    if (!selection.activeAccount) {
      setError('No active account found. Please set up an account in settings.');
      return;
    }

    // Show progress dialog
    setIsSubmitting(true);
    setProgressDialog({ open: true, status: 'loading', message: 'Please wait while we save your trade data...' });

    try {
      if (notesRef.current) {
        const latestNotes = notesRef.current.value;
        if (latestNotes !== trade.notes) {
          trade.notes = latestNotes;
        }
      }

      const normalizedMarket = normalizeMarket(trade.market);
      // When outcome is Win and user did not select Potential R:R, use the exact Risk:Reward Ratio
      const riskRewardRatioLong =
        trade.trade_outcome === 'Win' && (trade.risk_reward_ratio_long == null || trade.risk_reward_ratio_long === undefined)
          ? (Number(trade.risk_reward_ratio) || 0)
          : trade.risk_reward_ratio_long;
      const payload = {
        ...trade,
        market: normalizedMarket,
        risk_reward_ratio_long: riskRewardRatioLong,
      } as Trade & { user_id?: string; account_id?: string };
      const { id, user_id, account_id, calculated_profit, pnl_percentage, ...tradePayload } = payload;
      const { error } = await createTrade({
        mode: selection.mode,
        account_id: selection.activeAccount.id,
        calculated_profit: signedProfit,
        pnl_percentage: pnlPercentage,
        trade: tradePayload,
      });

      if (error) throw new Error(error.message);

      if (typeof window !== 'undefined') {
        localStorage.removeItem(`new-trade-draft-${selection.mode}`);
      }

      // Update progress message
      setProgressDialog({ open: true, status: 'loading', message: 'Updating analytics and refreshing charts...' });

      // ✅ Invalidate and refetch all queries to ensure analytics updates immediately
      await invalidateAndRefetchTradeQueries();

      // Show success
      setProgressDialog({ open: true, status: 'success', message: 'Your trade has been added successfully. All charts and statistics have been updated.' });

      // Wait 5 seconds to show success message, then close
      setTimeout(() => {
        setProgressDialog({ open: false, status: 'loading', message: '' });
        setIsSubmitting(false);
        if (onTradeCreated) onTradeCreated();
        onClose();
        // Reset form
        setTrade(initialTradeState);
      }, 2000);
    } catch (err: any) {
      setProgressDialog({ 
        open: true, 
        status: 'error', 
        message: 'Failed to create trade. Please check your data and try again.'
      });
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return (
    <>
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-3xl max-h-[90vh] fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 rounded-2xl p-0 flex flex-col overflow-hidden">
        {/* Gradient orbs background - fixed to modal (theme-aware via --orb-1/--orb-2) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div
            className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '8s' }}
          />
          <div
            className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '10s', animationDelay: '2s' }}
          />
        </div>

        {/* Noise texture overlay - fixed to modal */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Top accent line (theme-aware via --tc-primary) */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        {/* Fixed Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <AlertDialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between">
              <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg themed-header-icon-box">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <span>Add New Trade</span>
              </AlertDialogTitle>
              <div className="flex items-center gap-3">
                {/* Strategy name (from URL slug) */}
                <div className="max-w-[200px]">
                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Strategy</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={strategies.find((s) => s.id === trade.strategy_id)?.name ?? '—'}>
                      {strategies.find((s) => s.id === trade.strategy_id)?.name ?? '—'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="cursor-pointer rounded-sm ring-offset-background transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Adding trade for <span className="font-medium text-slate-900 dark:text-slate-50">{selection.mode}</span> mode
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Scrollable content wrapper */}
        <div className="relative overflow-y-auto flex-1 px-6 py-5">

          <form onSubmit={handleSubmit} className="space-y-5 mt-0">
            {/* Links & Info Section */}
            <div className={`grid gap-5 ${isTradingInstitutional ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {isTradingInstitutional && (
                <div className="space-y-2">
                  <Label htmlFor="liquidity-taken" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Liquidity Link
                  </Label>
                  <Input
                    id="liquidity-taken"
                    type="text"
                    value={trade.liquidity_taken}
                    onChange={(e) => updateTrade('liquidity_taken', e.target.value)}
                    className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                    placeholder="e.g., Buy side liquidity"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="trade-link" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Trade Link
                </Label>
                <Input
                  id="trade-link"
                  type="text"
                  value={trade.trade_link}
                  onChange={(e) => updateTrade('trade_link', e.target.value)}
                  className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                  placeholder="Chart link or reference"
                />
              </div>
            </div>

            <Separator />

            {/* Date & Time Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="trade-date" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Trade Date *
                </Label>
                <div className="relative">
                  <Input
                    id="trade-date"
                    type="date"
                    value={trade.trade_date}
                    onChange={(e) => updateTrade('trade_date', e.target.value)}
                    className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 pr-12 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-12 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500 shrink-0" strokeWidth={1.75} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trade-time-interval" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Trade Time (interval) *
                </Label>
                <Select
                  value={trade.trade_time || ''}
                  onValueChange={(v) => updateTrade('trade_time', v)}
                  required
                >
                  <SelectTrigger
                    id="trade-time-interval"
                    className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                  >
                    <SelectValue placeholder="Select time interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_INTERVALS.map((interval) => (
                      <SelectItem key={interval.start} value={interval.start}>
                        {interval.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Market & Setup Section (institutional: Market | Setup; non-institutional: Market | Evaluation + Trend) */}
            <div className={`grid gap-5 ${isTradingInstitutional ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
              <div className="space-y-2">
                <Label htmlFor="market" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Market *</Label>
                <MarketCombobox
                  id="market"
                  value={trade.market}
                  onChange={(v) => updateTrade('market', v)}
                  onBlur={() => {
                    const normalized = normalizeMarket(trade.market);
                    if (normalized !== trade.market) updateTrade('market', normalized);
                  }}
                  placeholder="Type market (e.g. EURUSD, EUR/USD)"
                  className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  dropdownClassName="z-[100]"
                />
              </div>

              {isTradingInstitutional ? (
                <div className="space-y-2">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Setup Type *</Label>
                  <Select value={trade.setup_type} onValueChange={(v) => updateTrade('setup_type', v)}>
                    <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                      <SelectValue placeholder="Select Setup" />
                    </SelectTrigger>
                    <SelectContent>
                      {SETUP_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Evaluation Grade</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 cursor-help text-slate-500 dark:text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent className="w-64 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 p-3">
                              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5">Grade guide</p>
                              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                <li className="flex items-center gap-2.5">
                                  <span className="w-6 h-6 rounded-md bg-blue-500/15 dark:bg-blue-400/20 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">A+</span>
                                  <span>Perfect execution</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                  <span className="w-6 h-6 rounded-md bg-emerald-500/15 dark:bg-emerald-400/20 flex items-center justify-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">A</span>
                                  <span>Excellent trade</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                  <span className="w-6 h-6 rounded-md bg-amber-500/15 dark:bg-amber-400/20 flex items-center justify-center text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">B</span>
                                  <span>Good trade</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                  <span className="w-6 h-6 rounded-md bg-orange-500/15 dark:bg-orange-400/20 flex items-center justify-center text-[10px] font-bold text-orange-600 dark:text-orange-400 shrink-0">C</span>
                                  <span>Poor execution</span>
                                </li>
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select value={trade.evaluation} onValueChange={(v) => updateTrade('evaluation', v)}>
                        <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                          <SelectValue placeholder="Select Grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {EVALUATION_OPTIONS.map((e) => (
                            <SelectItem key={e} value={e}>{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Trend</Label>
                      <Select value={trade.trend ?? ''} onValueChange={(v) => updateTrade('trend', v || null)}>
                        <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                          <SelectValue placeholder="Select Trend" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Trend-following">Trend-following</SelectItem>
                          <SelectItem value="Counter-trend">Counter-trend</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Direction & Outcome (Trend moved near Evaluation Grade) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Direction *</Label>
                <Select value={trade.direction} onValueChange={(v) => updateTrade('direction', v as 'Long' | 'Short')}>
                  <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                    <SelectValue placeholder="Select Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Long">Long</SelectItem>
                    <SelectItem value="Short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Trade Outcome *</Label>
                <Select
                  value={trade.trade_outcome}
                  onValueChange={(v) => setTrade(prev => ({ ...prev, trade_outcome: v, break_even: v === 'BE', be_final_result: v === 'BE' ? prev.be_final_result : null }))}
                >
                  <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                    <SelectValue placeholder="Select Trade Outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Win">Win</SelectItem>
                    <SelectItem value="Lose">Lose</SelectItem>
                    <SelectItem value="BE">BE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {trade.trade_outcome === 'BE' && (
                <div className="space-y-2">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    After BE
                  </Label>
                  <Select
                    value={trade.be_final_result ?? '__none__'}
                    onValueChange={(v) => updateTrade('be_final_result', v === '__none__' ? null : v)}
                  >
                    <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                      <SelectValue placeholder="Win or Lose at close" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      <SelectItem value="Win">Win</SelectItem>
                      <SelectItem value="Lose">Lose</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    How did this trade end after moving to break even? (e.g. closed in profit = Win, stopped out = Lose)
                  </p>
                </div>
              )}
            </div>

            {isTradingInstitutional && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Liquidity *</Label>
                  <Select value={trade.liquidity} onValueChange={(v) => updateTrade('liquidity', v)}>
                    <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                      <SelectValue placeholder="Select Liquidity" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIQUIDITY_OPTIONS.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">MSS *</Label>
                  <Select value={trade.mss} onValueChange={(v) => updateTrade('mss', v)}>
                    <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                      <SelectValue placeholder="Select MSS" />
                    </SelectTrigger>
                    <SelectContent>
                      {MSS_OPTIONS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Risk Management Section */}
            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Risk per Trade (%) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={String(trade.risk_per_trade ?? '')}
                  onChange={(e) => updateTrade('risk_per_trade', parseFloat(e.target.value) || 0)}
                  className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                  placeholder="e.g. 1.5"
                  required
                />
                </div>

                <div className="space-y-2">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Risk:Reward Ratio *</Label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={String(trade.risk_reward_ratio ?? '')}
                  onChange={(e) => updateTrade('risk_reward_ratio', parseFloat(e.target.value) || 0)}
                  className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                  placeholder="e.g. 2"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Potential Risk:Reward Ratio</Label>
                {trade.trade_outcome === 'Lose' || trade.trade_outcome === 'BE' ? (
                  <Input
                    type="text"
                    value="0"
                    readOnly
                    className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-200/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                ) : (
                  <Select
                    value={
                      trade.risk_reward_ratio_long && trade.risk_reward_ratio_long > 0
                        ? String(trade.risk_reward_ratio_long)
                        : undefined
                    }
                    onValueChange={(v) =>
                      updateTrade(
                        'risk_reward_ratio_long',
                        v === '' || v === '__none__' ? (undefined as any) : Number(v),
                      )
                    }
                  >
                    <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                      <SelectValue placeholder="Select ratio (1 – 10 or 10+)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No potential R:R</SelectItem>
                      {POTENTIAL_RR_OPTIONS.map((opt) => {
                        const baseValue = Number(trade.risk_reward_ratio ?? 0);
                        const disabled =
                          trade.trade_outcome === 'Win' && opt.value <= baseValue;
                        return (
                          <SelectItem
                            key={opt.value}
                            value={String(opt.value)}
                            disabled={disabled}
                          >
                            {opt.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  SL Size {isTradingInstitutional ? '*' : ''}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={String(trade.sl_size ?? '')}
                  onChange={(e) => updateTrade('sl_size', parseFloat(e.target.value) || 0)}
                  className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                  placeholder="e.g. 10"
                  required={isTradingInstitutional}
                />
              </div>

              {isTradingInstitutional && (
                <div className="space-y-2">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">FVG Size</Label>
                  <Select
                    value={
                      trade.fvg_size == null || trade.fvg_size === undefined
                        ? ''
                        : FVG_SIZE_PRESET_VALUES.includes(trade.fvg_size)
                          ? String(trade.fvg_size)
                          : 'custom'
                    }
                    onValueChange={(v) => {
                      if (v === 'custom') {
                        updateTrade('fvg_size', FVG_SIZE_CUSTOM_MIN);
                      } else if (v === '') {
                        updateTrade('fvg_size', undefined as any);
                      } else {
                        updateTrade('fvg_size', Number(v));
                      }
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                      <SelectValue placeholder="Select FVG Size" />
                    </SelectTrigger>
                    <SelectContent>
                      {FVG_SIZE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom (3+)</SelectItem>
                    </SelectContent>
                  </Select>
                  {trade.fvg_size != null && !FVG_SIZE_PRESET_VALUES.includes(trade.fvg_size) && (
                    <div className="pt-1">
                      <Input
                        type="number"
                        step="0.5"
                        min={FVG_SIZE_CUSTOM_MIN}
                        inputMode="decimal"
                        value={String(trade.fvg_size)}
                        onChange={(e) => {
                          const raw = parseFloat(e.target.value);
                          if (Number.isNaN(raw)) {
                            updateTrade('fvg_size', FVG_SIZE_CUSTOM_MIN);
                            return;
                          }
                          const snapped = snapToHalfStep(raw);
                          const clamped = snapped < FVG_SIZE_CUSTOM_MIN ? FVG_SIZE_CUSTOM_MIN : snapped;
                          updateTrade('fvg_size', clamped);
                        }}
                        onBlur={(e) => {
                          const raw = parseFloat(e.target.value);
                          if (Number.isNaN(raw) || raw < FVG_SIZE_CUSTOM_MIN) {
                            updateTrade('fvg_size', trade.fvg_size != null && trade.fvg_size >= FVG_SIZE_CUSTOM_MIN ? trade.fvg_size : FVG_SIZE_CUSTOM_MIN);
                            return;
                          }
                          const snapped = snapToHalfStep(raw);
                          const clamped = snapped < FVG_SIZE_CUSTOM_MIN ? FVG_SIZE_CUSTOM_MIN : snapped;
                          updateTrade('fvg_size', clamped);
                        }}
                        className="h-10 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 themed-focus text-slate-900 dark:text-slate-50"
                        placeholder="e.g. 3.5, 4, 4.5 (0.5 steps only)"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Only 0.5 steps from 3.5 onward (e.g. 3.5, 4, 4.5). Values are rounded to nearest 0.5.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isTradingInstitutional && (
                <div className="space-y-2">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Displacement Size (Points)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={String(trade.displacement_size ?? '')}
                    onChange={(e) => updateTrade('displacement_size', parseFloat(e.target.value) || 0)}
                    className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                    placeholder="Displacement"
                  />
                </div>
              )}

              {isTradingInstitutional && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Evaluation Grade</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 cursor-help text-slate-500 dark:text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent className="w-64 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 p-3">
                          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5">Grade guide</p>
                          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                            <li className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-md bg-blue-500/15 dark:bg-blue-400/20 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">A+</span>
                              <span>Perfect execution</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-md bg-emerald-500/15 dark:bg-emerald-400/20 flex items-center justify-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">A</span>
                              <span>Excellent trade</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-md bg-amber-500/15 dark:bg-amber-400/20 flex items-center justify-center text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">B</span>
                              <span>Good trade</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-md bg-orange-500/15 dark:bg-orange-400/20 flex items-center justify-center text-[10px] font-bold text-orange-600 dark:text-orange-400 shrink-0">C</span>
                              <span>Poor execution</span>
                            </li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select value={trade.evaluation} onValueChange={(v) => updateTrade('evaluation', v)}>
                    <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                      <SelectValue placeholder="Select Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVALUATION_OPTIONS.map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isTradingInstitutional && (
                <div className="space-y-2">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Trend</Label>
                  <Select value={trade.trend ?? ''} onValueChange={(v) => updateTrade('trend', v || null)}>
                    <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                      <SelectValue placeholder="Select Trend" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Trend-following">Trend-following</SelectItem>
                      <SelectItem value="Counter-trend">Counter-trend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* P&L Display */}
            <div className="p-5 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/60 dark:border-slate-600 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Calculated P&L:</span>
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={pnlPercentage >= 0 ? 'default' : 'destructive'} 
                    className={`text-sm font-bold px-2.5 py-1 focus:ring-0 focus-visible:ring-0 hover:ring-0 ${
                      pnlPercentage >= 0 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-500/10 hover:dark:bg-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-500/10 hover:dark:bg-rose-500/20'
                    }`}
                  >
                    {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
                  </Badge>
                  <span className={`text-xl font-bold ${pnlPercentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {currency}{signedProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Options - Checkboxes */}
            <div className="flex flex-wrap gap-5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reentry"
                  checked={trade.reentry}
                  onCheckedChange={(checked) => updateTrade('reentry', checked as boolean)}
                  className="themed-checkbox h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-150 data-[state=checked]:!text-white"
                />
                <Label htmlFor="reentry" className="text-sm font-normal cursor-pointer">Re-entry</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="news-related"
                  checked={trade.news_related}
                  onCheckedChange={(checked) => updateTrade('news_related', checked as boolean)}
                  className="themed-checkbox h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-150 data-[state=checked]:!text-white"
                />
                <Label htmlFor="news-related" className="text-sm font-normal cursor-pointer">News</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="local-high-low"
                  checked={trade.local_high_low}
                  onCheckedChange={(checked) => updateTrade('local_high_low', checked as boolean)}
                  className="themed-checkbox h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-150 data-[state=checked]:!text-white"
                />
                <Label htmlFor="local-high-low" className="text-sm font-normal cursor-pointer">Local High/Low</Label>
              </div>

              {isTradingInstitutional && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="launch-hour"
                          checked={trade.launch_hour}
                          onCheckedChange={(checked) => updateTrade('launch_hour', checked as boolean)}
                          className="themed-checkbox h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-150 data-[state=checked]:!text-white"
                        />
                        <Label htmlFor="launch-hour" className="text-sm font-normal cursor-pointer">LH</Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 p-2.5">
                      <p>Launch Hour</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="partials-taken"
                  checked={trade.partials_taken}
                  onCheckedChange={(checked) => updateTrade('partials_taken', checked as boolean)}
                  className="themed-checkbox h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-150 data-[state=checked]:!text-white"
                />
                <Label htmlFor="partials-taken" className="text-sm font-normal cursor-pointer">Partial Profit</Label>
              </div>

              {/* Not Executed (inverted logic) */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="not-executed"
                  checked={trade.executed === false}
                  onCheckedChange={(checked) => updateTrade('executed', checked ? false : true)}
                  className="themed-checkbox h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-150 data-[state=checked]:!text-white"
                />
                <Label htmlFor="not-executed" className="text-sm font-normal cursor-pointer">Not Executed</Label>
              </div>
            </div>

            {/* Notes & Confidence Section */}
            <div className="space-y-3">
              <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Notes & Confidence</Label>
              <Textarea
                ref={notesRef}
                defaultValue={trade.notes}
                onBlur={(e) => updateTrade('notes', e.target.value)}
                className="min-h-[280px] backdrop-blur-sm shadow-sm bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-600 themed-focus transition-all duration-300 placeholder:text-slate-500 dark:placeholder:text-slate-600 text-slate-900 dark:text-slate-100"
                placeholder="Add your trade notes here..."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/60 dark:border-slate-600 shadow-sm">
                {/* Confidence */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Confidence</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 cursor-help text-slate-400 dark:text-slate-500 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent className="w-64 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 p-3">
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            How sure were you in this trade? From &quot;not at all&quot; to &quot;very confident&quot; in the setup and your decision. Helps you spot overconfidence or doubt when you review later.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateTrade('confidence_at_entry', value)}
                        className={`min-w-[2.25rem] px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer ${
                          trade.confidence_at_entry === value
                            ? 'themed-header-icon-box shadow-sm'
                            : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                        title={['Very low', 'Low', 'Neutral', 'Good', 'Very confident'][value - 1]}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  {trade.confidence_at_entry != null && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Selected: {[null, 'Very low', 'Low', 'Neutral', 'Good', 'Very confident'][trade.confidence_at_entry]}
                    </p>
                  )}
                </div>
                {/* Mind state (covers focus, fear, calm, stress, impatience, etc.) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Mind state</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 cursor-help text-slate-400 dark:text-slate-500 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent className="w-64 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 p-3">
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            How were you when you entered? e.g. calm, focused, stressed, fearful, impatient. 1 = very poor state, 5 = very good state. Helps you see how your state matched the outcome.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateTrade('mind_state_at_entry', value)}
                        className={`min-w-[2.25rem] px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer ${
                          trade.mind_state_at_entry === value
                            ? 'themed-header-icon-box shadow-sm'
                            : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                        title={['Very poor', 'Poor', 'Neutral', 'Good', 'Very good'][value - 1]}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  {trade.mind_state_at_entry != null && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Selected: {['Very poor', 'Poor', 'Neutral', 'Good', 'Very good'][trade.mind_state_at_entry - 1]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Error message above Create Trade button – auto-dismiss after 3s */}
            {error && (
              <Alert variant="destructive" className="mb-2 bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60 [&_svg]:text-white"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Creating...' : 'Create Trade'}
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              </Button>
            </div>
          </form>
        </div>
      </AlertDialogContent>
    </AlertDialog>

    {/* Progress Dialog - matches TradeDetailsModal delete dialog design */}
    <AlertDialog open={progressDialog.open} onOpenChange={() => {
      if (progressDialog.status !== 'loading') {
        setProgressDialog({ open: false, status: 'loading', message: '' });
      }
    }}>
      <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {progressDialog.status === 'loading' && (
              <span className="themed-heading-accent font-semibold text-lg flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Trade
              </span>
            )}
            {progressDialog.status === 'success' && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-lg flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Trade Created Successfully
              </span>
            )}
            {progressDialog.status === 'error' && (
              <span className="text-red-500 dark:text-red-400 font-semibold text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Error Creating Trade
              </span>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span className="text-slate-600 dark:text-slate-400">
              {progressDialog.message}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {/* Only show footer with button for error state */}
        {progressDialog.status === 'error' && (
          <AlertDialogFooter className="flex gap-3">
            <Button
              onClick={() => setProgressDialog({ open: false, status: 'loading', message: '' })}
              className="cursor-pointer rounded-xl border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800/70"
            >
              Close
            </Button>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
