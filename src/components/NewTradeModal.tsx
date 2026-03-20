'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProgressDialog } from '@/hooks/useProgressDialog';
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
} from '@/components/ui/alert-dialog';
import { getMarketValidationError, normalizeMarket } from '@/utils/validateMarket';
import { calculateTradePnl } from '@/utils/helpers/tradePnlCalculator';
import { tradeDateAndTimeToUtcISO } from '@/utils/tradeExecutedAt';
import { getDayOfWeekFromTradeDate } from '@/utils/dateRangeHelpers';
import { MarketCombobox } from '@/components/MarketCombobox';
import { NewsCombobox } from '@/components/NewsCombobox';
import { CommonCombobox } from '@/components/CommonCombobox';
import { TIME_INTERVALS, getIntervalForTime } from '@/constants/analytics';
import {
  mergeLiquidityTypeIntoSaved,
  mergeMarketIntoSaved,
  mergeNewsIntoSaved,
  mergeSetupTypeIntoSaved,
  normalizeNewsName,
} from '@/utils/savedFeatures';
import { queryKeys } from '@/lib/queryKeys';
import type { SavedNewsItem } from '@/types/account-settings';
import { useSettings } from '@/hooks/useSettings';
import { updateSavedNews, updateSavedMarkets } from '@/lib/server/settings';
import { updateStrategySetupTypes, updateStrategyLiquidityTypes, updateStrategyFavourites } from '@/lib/server/strategies';
import type { Strategy, SavedFavouritesKind } from '@/types/strategy';

const MSS_OPTIONS = ['Normal', 'Aggressive', 'Wick', 'Internal'];
const EVALUATION_OPTIONS = ['A+', 'A', 'B', 'C'];
const SESSION_OPTIONS = ['Sydney', 'Tokyo', 'London', 'New York'] as const;
const SCREEN_TIMEFRAME_OPTIONS = ['4H', '1H', '15m', '5m', '3m', '1m', 'Custom'] as const;
const SCREEN_TIMEFRAME_PRESET_OPTIONS = ['4H', '1H', '15m', '5m', '3m', '1m'] as const;

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
  const accountId = selection.activeAccount?.id;
  const { data: userData } = useUserDetails();
  const userId = userData?.user?.id;
  const { settings } = useSettings({ userId });
  const { strategies } = useStrategies({ userId, accountId });
  const queryClient = useQueryClient();
  
  // Get strategy slug from URL params and derive extra_cards from the strategy object
  const strategySlug = params?.strategy as string | undefined;
  const currentStrategy = strategies.find((s) => s.slug === strategySlug);
  const strategyExtraCards = useMemo(() => currentStrategy?.extra_cards ?? [], [currentStrategy?.extra_cards]);
  const hasCard = useCallback(
    (key: string) => strategyExtraCards.includes(key as any),
    [strategyExtraCards],
  );
  // Backward compat: treat any extra card being enabled as "institutional" for layout/validation
  const hasAnyExtraCard = strategyExtraCards.length > 0;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { error, setError } = useProgressDialog(3000);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const initialTradeState: Trade = useMemo(() => ({
    trade_screens: ['', '', '', ''],
    trade_screen_timeframes: ['', '', '', ''],
    trade_time: '',
    trade_date: new Date().toISOString().split('T')[0],
    day_of_week: WEEKDAY_MAP[new Date().toLocaleDateString('en-US', { weekday: 'long' })],
    market: '',
    setup_type: '',
    liquidity: '',
    sl_size: undefined as any,
    direction: '' as 'Long' | 'Short',
    trade_outcome: '' as 'Win' | 'Lose',
    session: '',
    be_final_result: null as string | null,
    break_even: false,
    reentry: false,
    news_related: false,
    news_name: null as string | null,
    news_intensity: null as number | null,
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
  }), [selection.mode]);

  const [trade, setTrade] = useState<Trade>(initialTradeState);

  const [showExtraScreens, setShowExtraScreens] = useState(false);

  // Auto-reveal extra screens if draft has slots 3 or 4 filled
  useEffect(() => {
    if (trade.trade_screens?.[2] || trade.trade_screens?.[3]) {
      setShowExtraScreens(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically set strategy_id from URL slug when modal opens or slug/strategies change
  useEffect(() => {
    if (isOpen && strategySlug && strategies.length > 0) {
      // Decode the strategy slug (URL-encoded)
      const decodedSlug = decodeURIComponent(strategySlug);
      // Find strategy by slug
      const strategy = strategies.find((s) => s.slug === decodedSlug);
      if (strategy) {
        setTrade((prev) => prev.strategy_id === strategy.id ? prev : { ...prev, strategy_id: strategy.id });
      }
    }
  }, [isOpen, strategySlug, strategies]);

  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const customTfInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const tradeRef = useRef<Trade>(initialTradeState);

  useEffect(() => {
    tradeRef.current = trade;
  }, [trade]);

  const updateTrade = useCallback(<K extends keyof Trade>(key: K, value: Trade[K]) => {
    setTrade((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const handleTradeOutcomeChange = useCallback((v: Trade['trade_outcome']) => {
    setTrade((prev) => ({
      ...prev,
      trade_outcome: v,
      break_even: v === 'BE',
      be_final_result: v === 'BE' ? prev.be_final_result : null,
    }));
  }, []);

  // Helper function to invalidate and refetch trade queries (ensures analytics updates)
  const invalidateAndRefetchTradeQueries = useCallback(async (params?: {
    mode?: typeof selection.mode;
    accountId?: string | undefined;
    userId?: string | undefined;
    strategyId?: string | null;
  }) => {
    // Signal strategy page to skip re-hydrating from stale initialData (so calendar/list show new trade).
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('trade-data-invalidated', Date.now().toString());
    }
    
    // Get current context for explicit refetch
    const mode = params?.mode ?? selection.mode;
    const accountId = params?.accountId ?? selection.activeAccount?.id;
    const strategyId = params?.strategyId ?? null;
    const effectiveUserId = params?.userId ?? userId;
    
    // Invalidate trade-related queries — scoped to the affected strategy
    await queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey;
      if (!Array.isArray(key)) return false;
      const firstKey = key[0];
      // Global caches span all strategies — always invalidate
      if (firstKey === 'all-strategy-trades' || firstKey === 'all-strategy-stats' || firstKey === 'strategies-overview') return true;
      // Per-strategy queries — only invalidate the affected strategy
      if (firstKey === 'allTrades') return (key[5] ?? null) === strategyId;
      if (firstKey === 'filteredTrades' || firstKey === 'nonExecutedTrades') return (key[7] ?? null) === strategyId;
      // Dashboard stats API route — strategyId is at index 4
      if (firstKey === 'dashboardStats') return (key[4] ?? null) === strategyId;
      // Calendar trades — strategyId is at index 4
      if (firstKey === 'calendarTrades') return (key[4] ?? null) === strategyId;
      return false;
    }});

    // Refetch strategies-overview (and the legacy all-strategy-trades) for ALL observers.
    // This ensures StrategiesClient shows updated stats immediately after a trade is added,
    // even if StrategiesClient wasn't mounted at the time of the mutation.
    if (accountId && effectiveUserId) {
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: queryKeys.allStrategyTrades(effectiveUserId, accountId, mode),
        }),
        queryClient.refetchQueries({
          queryKey: ['strategies-overview', effectiveUserId, accountId, mode],
        }),
      ]);
    }

    // Explicitly refetch active queries for the affected strategy so the UI updates immediately.
    // dashboardStats  → AccountOverviewCard (monthly P&L), aggregate stats cards (win rate, P&L, etc.)
    // filteredTrades  → tradesToUse array used by equity curve, confidence cards, etc.
    //                   (Phase 1: trade arrays come from a separate query, not from series[])
    // calendarTrades  → calendar view
    await queryClient.refetchQueries({
      predicate: (query) => {
        const key = query.queryKey;
        if (!Array.isArray(key)) return false;
        const firstKey = key[0];
        if (firstKey === 'dashboardStats') return (key[4] ?? null) === strategyId;
        if (firstKey === 'calendarTrades') return (key[4] ?? null) === strategyId;
        // filteredTrades key: ['filteredTrades', mode, accountId, userId, viewMode, start, end, strategyId]
        if (firstKey === 'filteredTrades') return (key[7] ?? null) === strategyId;
        return false;
      },
      type: 'active',
    });
  }, [selection, userId, queryClient]);

  // keep weekday + quarter in sync when the committed date changes (use local date to avoid timezone shifting day)
  useEffect(() => {
    const dateStr = trade.trade_date;
    const engDay = getDayOfWeekFromTradeDate(dateStr);
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

  // When Win outcome: clear Potential R:R if the current selection is no longer valid
  // (i.e. it's <= the R:R ratio, meaning it must be at least RR + 0.5)
  useEffect(() => {
    if (
      trade.trade_outcome === 'Win' &&
      trade.risk_reward_ratio_long != null &&
      Number(trade.risk_reward_ratio_long) > 0 &&
      Number(trade.risk_reward_ratio_long) <= Number(trade.risk_reward_ratio ?? 0)
    ) {
      setTrade((prev) => ({ ...prev, risk_reward_ratio_long: undefined as any }));
    }
  }, [trade.risk_reward_ratio, trade.trade_outcome, trade.risk_reward_ratio_long]);

  // -------- Derived calculations --------
  const accountBalance = selection.activeAccount?.account_balance ?? 0;
  const currency = selection.activeAccount?.currency === 'EUR' ? '€' : '$';

  const setupOptions = currentStrategy?.saved_setup_types ?? [];
  /** Liquidity: HOD/LOD always first, then strategy's saved_liquidity_types (deduplicated). */
  const liquidityOptions = useMemo(
    () => Array.from(new Set(['HOD', 'LOD', ...(currentStrategy?.saved_liquidity_types ?? [])])),
    [currentStrategy?.saved_liquidity_types]
  );

  const { pnl_percentage: pnlPercentage, calculated_profit: signedProfit } = useMemo(
    () => calculateTradePnl(trade, accountBalance),
    [accountBalance, trade]
  );

  const handleEditSavedMarket = useCallback(async (oldName: string, newName: string) => {
    if (!userId) return;
    const saved = Array.isArray(settings.saved_markets) ? settings.saved_markets : [];
    const normalize = (m: string) => m.trim().toUpperCase();
    const oldNorm = normalize(oldName);
    const newTrimmed = newName.trim();
    if (!newTrimmed) return;
    const newNorm = newTrimmed.toUpperCase();
    const exists = saved.some((m) => normalize(m) === newNorm);
    let next: string[];
    if (exists) {
      next = saved.filter((m) => normalize(m) !== oldNorm);
    } else {
      next = saved.map((m) => (normalize(m) === oldNorm ? newTrimmed : m));
    }
    if (next.length === saved.length && exists) return;
    const { error } = await updateSavedMarkets(next);
    if (error) {
      console.error('Failed to rename saved market:', error.message ?? error);
      return;
    }
    const settingsKey = queryKeys.settings(userId);
    queryClient.setQueryData(
      settingsKey,
      (prev: { saved_news?: unknown; saved_markets?: string[] } | undefined) => ({
        ...prev,
        saved_markets: next,
      })
    );
  }, [userId, settings.saved_markets, queryClient]);

  const handleEditSavedSetup = useCallback(async (oldName: string, newName: string) => {
    if (!userId || !currentStrategy) return;
    const current = currentStrategy.saved_setup_types ?? [];
    const normalize = (s: string) => s.trim().toLowerCase();
    const oldNorm = normalize(oldName);
    const newTrimmed = newName.trim();
    if (!newTrimmed) return;
    const newNorm = newTrimmed.toLowerCase();
    const exists = current.some((s) => normalize(s) === newNorm);
    let next: string[];
    if (exists) {
      next = current.filter((s) => normalize(s) !== oldNorm);
    } else {
      next = current.map((s) => (normalize(s) === oldNorm ? newTrimmed : s));
    }
    if (next.length === current.length && exists) return;
    await updateStrategySetupTypes(currentStrategy.id, userId, next);
    const strategiesKey = queryKeys.strategies(userId, accountId);
    queryClient.setQueryData(
      strategiesKey,
      (prev: { id: string; saved_setup_types?: string[]; saved_liquidity_types?: string[] }[] | undefined) => {
        if (!prev) return prev;
        return prev.map((s) =>
          s.id === currentStrategy.id
            ? {
                ...s,
                saved_setup_types: next,
              }
            : s
        );
      }
    );
  }, [userId, accountId, currentStrategy, queryClient]);

  const handleEditSavedLiquidity = useCallback(async (oldName: string, newName: string) => {
    if (!userId || !currentStrategy) return;
    const current = currentStrategy.saved_liquidity_types ?? [];
    const normalize = (s: string) => s.trim().toLowerCase();
    const oldNorm = normalize(oldName);
    const newTrimmed = newName.trim();
    if (!newTrimmed) return;
    const newNorm = newTrimmed.toLowerCase();
    const exists = current.some((s) => normalize(s) === newNorm);
    let next: string[];
    if (exists) {
      next = current.filter((s) => normalize(s) !== oldNorm);
    } else {
      next = current.map((s) => (normalize(s) === oldNorm ? newTrimmed : s));
    }
    if (next.length === current.length && exists) return;
    await updateStrategyLiquidityTypes(currentStrategy.id, userId, next);
    const strategiesKey = queryKeys.strategies(userId, accountId);
    queryClient.setQueryData(
      strategiesKey,
      (prev: { id: string; saved_setup_types?: string[]; saved_liquidity_types?: string[] }[] | undefined) => {
        if (!prev) return prev;
        return prev.map((s) =>
          s.id === currentStrategy.id
            ? {
                ...s,
                saved_liquidity_types: next,
              }
            : s
        );
      }
    );
  }, [userId, accountId, currentStrategy, queryClient]);

  const handleEditSavedNews = useCallback(async (item: SavedNewsItem, newName: string) => {
    if (!userId) return;
    const saved = Array.isArray(settings.saved_news) ? (settings.saved_news as SavedNewsItem[]) : [];
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updated = saved.map((n) => {
      if (n.id !== item.id) return n;
      const aliases = n.aliases ?? [];
      const prevName = n.name;
      const nextAliases =
        prevName && !aliases.includes(prevName) ? [...aliases, prevName] : aliases;
      return {
        ...n,
        name: trimmed,
        aliases: nextAliases,
      };
    });
    const { error } = await updateSavedNews(updated);
    if (error) {
      console.error('Failed to rename saved news:', error.message ?? error);
      return;
    }
    const settingsKey = queryKeys.settings(userId);
    queryClient.setQueryData(
      settingsKey,
      (prev: { saved_news?: unknown; saved_markets?: string[] } | undefined) => ({
        ...prev,
        saved_news: updated,
      })
    );
  }, [userId, settings.saved_news, queryClient]);

  const handleToggleFavourite = useCallback(
    (kind: SavedFavouritesKind) => (itemId: string) => {
      if (!currentStrategy || !userId || !accountId) return;
      const strategyId = currentStrategy.id;
      void updateStrategyFavourites(strategyId, userId, kind, itemId).then((nextSavedFavourites) => {
        if (nextSavedFavourites == null) return;
        const key = queryKeys.strategies(userId, accountId);
        queryClient.setQueryData(key, (prev: Strategy[] | undefined) =>
          prev?.map((s) =>
            s.id === strategyId ? { ...s, saved_favourites: nextSavedFavourites } : s
          )
        );
      });
    },
    [currentStrategy, userId, accountId, queryClient]
  );

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const currentTrade = tradeRef.current;

    const marketError = getMarketValidationError(currentTrade.market);
    if (marketError) {
      setError(marketError);
      return;
    }
    if (!currentTrade.direction || !currentTrade.trade_outcome) {
      setError('Please select Direction and Trade Outcome.');
      return;
    }
    if (!currentTrade.session || currentTrade.session.trim() === '') {
      setError('Please select Session.');
      return;
    }
    if (!currentTrade.trade_time || currentTrade.trade_time.trim() === '') {
      setError('Please select Trade Time (interval).');
      return;
    }
    if (hasCard('setup_stats') && !currentTrade.setup_type) {
      setError('Please fill in the Pattern / Setup field.');
      return;
    }
    if (hasCard('liquidity_stats') && !currentTrade.liquidity) {
      setError('Please fill in the Conditions / Liquidity field.');
      return;
    }
    if (hasCard('mss_stats') && !currentTrade.mss) {
      setError('Please fill in the MSS field.');
      return;
    }
    if (hasCard('evaluation_stats') && !currentTrade.evaluation?.trim()) {
      setError('Please select Evaluation Grade.');
      return;
    }
    if (hasCard('trend_stats') && !currentTrade.trend?.trim()) {
      setError('Please select Trend.');
      return;
    }
    if (hasCard('fvg_size') && (currentTrade.fvg_size == null || currentTrade.fvg_size === undefined)) {
      setError('Please fill in the FVG Size field.');
      return;
    }
    if ((hasCard('displacement_size') || hasCard('avg_displacement')) && (currentTrade.displacement_size == null || currentTrade.displacement_size === undefined)) {
      setError('Please fill in the Displacement Size (Points) field.');
      return;
    }
    if (hasCard('sl_size_stats') && (currentTrade.sl_size == null || currentTrade.sl_size === undefined)) {
      setError('Please fill in the SL Size field.');
      return;
    }

    if (!currentTrade.strategy_id) {
      setError('Strategy not found. Please navigate to a valid strategy page.');
      return;
    }

    if (!selection.activeAccount) {
      setError('No active account found. Please set up an account in settings.');
      return;
    }

    setIsSubmitting(true);

    try {
      const tradeSnapshot = currentTrade;
      const currentStrategySnapshot = currentStrategy;
      const settingsSnapshot = settings;
      const userIdSnapshot = userId;
      const accountIdSnapshot = accountId;

      const notes = notesRef.current ? notesRef.current.value : currentTrade.notes;

      const normalizedMarket = normalizeMarket(currentTrade.market);
      // When outcome is Win and user did not select Potential R:R, use the exact Risk:Reward Ratio
      const riskRewardRatioLong =
        currentTrade.trade_outcome === 'Win' && (currentTrade.risk_reward_ratio_long == null || currentTrade.risk_reward_ratio_long === undefined)
          ? (Number(currentTrade.risk_reward_ratio) || 0)
          : currentTrade.risk_reward_ratio_long;
      const payload = {
        ...currentTrade,
        notes,
        market: normalizedMarket,
        risk_reward_ratio_long: riskRewardRatioLong,
        trade_executed_at: tradeDateAndTimeToUtcISO(currentTrade.trade_date, currentTrade.trade_time) ?? undefined,
      } as Trade & { user_id?: string; account_id?: string };
      const { id, user_id, account_id, calculated_profit, pnl_percentage, ...tradePayload } = payload;

      const accountBalanceForSubmit = selection.activeAccount.account_balance ?? 0;
      const { pnl_percentage: submitPnlPercentage, calculated_profit: submitCalculatedProfit } =
        calculateTradePnl(currentTrade, accountBalanceForSubmit);

      const { error } = await createTrade({
        mode: selection.mode,
        account_id: selection.activeAccount.id,
        calculated_profit: submitCalculatedProfit,
        pnl_percentage: submitPnlPercentage,
        trade: tradePayload,
      });

      if (error) throw new Error(error.message);

      // Close immediately — refetch + sync run in background after modal closes
      setIsSubmitting(false);
      setTrade(initialTradeState);
      if (onTradeCreated) onTradeCreated();
      onClose();

      // Background: invalidate queries + sync saved lists + update cache
      void (async () => {
        try {
          await invalidateAndRefetchTradeQueries({
            mode: selection.mode,
            accountId: selection.activeAccount?.id,
            userId: userId ?? undefined,
            strategyId: tradeSnapshot.strategy_id ?? null,
          });
          // Compute updated lists and persist to DB; then update React Query cache so suggestion lists show new data without page refresh
          let updatedNews: SavedNewsItem[] | undefined;
          let updatedSetups: string[] | undefined;
          let updatedLiquidity: string[] | undefined;
          let updatedMarkets: string[] | undefined;

          const savePromises: Promise<unknown>[] = [];

          if (tradeSnapshot.news_related && tradeSnapshot.news_name?.trim() && userIdSnapshot) {
            const savedNews = Array.isArray(settingsSnapshot.saved_news) ? settingsSnapshot.saved_news : [];
            updatedNews = mergeNewsIntoSaved(
              normalizeNewsName(tradeSnapshot.news_name),
              tradeSnapshot.news_intensity ?? null,
              savedNews,
            );
            savePromises.push(updateSavedNews(updatedNews));
          }

          if (tradeSnapshot.setup_type?.trim() && userIdSnapshot && currentStrategySnapshot) {
            updatedSetups = mergeSetupTypeIntoSaved(
              tradeSnapshot.setup_type,
              currentStrategySnapshot.saved_setup_types ?? [],
            );
            savePromises.push(updateStrategySetupTypes(currentStrategySnapshot.id, userIdSnapshot, updatedSetups));
          }

          if (tradeSnapshot.liquidity?.trim() && userIdSnapshot && currentStrategySnapshot) {
            updatedLiquidity = mergeLiquidityTypeIntoSaved(
              tradeSnapshot.liquidity,
              currentStrategySnapshot.saved_liquidity_types ?? [],
            );
            savePromises.push(updateStrategyLiquidityTypes(currentStrategySnapshot.id, userIdSnapshot, updatedLiquidity));
          }

          if (tradeSnapshot.market?.trim() && userIdSnapshot) {
            const savedMarkets = Array.isArray(settingsSnapshot.saved_markets) ? settingsSnapshot.saved_markets : [];
            updatedMarkets = mergeMarketIntoSaved(tradeSnapshot.market, savedMarkets);
            savePromises.push(updateSavedMarkets(updatedMarkets));
          }

          await Promise.all(savePromises);

          // Update cache immediately so next time modal opens, useSettings/useStrategies see fresh data (refetch alone doesn't work because those queries use enabled: !cached)
          if (userIdSnapshot) {
            const settingsKey = queryKeys.settings(userIdSnapshot);
            queryClient.setQueryData(
              settingsKey,
              (prev: { saved_news?: unknown; saved_markets?: string[] } | undefined) => ({
                ...prev,
                saved_news: updatedNews ?? prev?.saved_news ?? [],
                saved_markets: updatedMarkets ?? prev?.saved_markets ?? [],
              }),
            );

            if (currentStrategySnapshot && (updatedSetups !== undefined || updatedLiquidity !== undefined)) {
              const strategiesKey = queryKeys.strategies(userIdSnapshot, accountIdSnapshot);
              queryClient.setQueryData(
                strategiesKey,
                (prev:
                  | { id: string; saved_setup_types?: string[]; saved_liquidity_types?: string[] }[]
                  | undefined) => {
                  if (!prev) return prev;
                  return prev.map((s) =>
                    s.id === currentStrategySnapshot.id
                      ? {
                          ...s,
                          saved_setup_types: updatedSetups ?? s.saved_setup_types ?? [],
                          saved_liquidity_types: updatedLiquidity ?? s.saved_liquidity_types ?? [],
                        }
                      : s,
                  );
                },
              );
            }

            // Keep existing behavior: mark cached settings/strategies stale so any consumers refetch if needed.
            await queryClient.invalidateQueries({ queryKey: queryKeys.settings(userIdSnapshot) });
            await queryClient.invalidateQueries({ queryKey: queryKeys.strategies(userIdSnapshot, accountIdSnapshot) });
          }
        } catch (syncErr) {
          console.error('Post-create trade sync failed:', syncErr);
          // Do not surface UI error here — trade was created successfully.
        }
      })();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create trade. Please check your data and try again.');
      setIsSubmitting(false);
    }
  }, [hasCard, selection, userId, accountId, settings, currentStrategy, queryClient, invalidateAndRefetchTradeQueries, initialTradeState, onTradeCreated, onClose, setError]);

  if (!mounted || !isOpen) return null;

  return (
    <>
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-3xl max-h-[90vh] fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 flex flex-col overflow-hidden">
        {/* Gradient orbs background - fixed to modal (theme-aware via --orb-1/--orb-2) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div
            className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl"
          />
          <div
            className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl"
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
            {/* Trade Screens Section */}
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[0, 1].map((i) => {
                  const currentTf = (trade.trade_screen_timeframes?.[i] ?? '').trim();
                  const isCustomTf =
                    currentTf !== '' &&
                    !SCREEN_TIMEFRAME_PRESET_OPTIONS.includes(
                      currentTf as (typeof SCREEN_TIMEFRAME_PRESET_OPTIONS)[number]
                    );
                  return (
                  <div
                    key={i}
                    className="space-y-2"
                    onBlurCapture={(e) => {
                      const nextFocused = e.relatedTarget as Node | null;
                      if (nextFocused && e.currentTarget.contains(nextFocused)) return;
                      const screenUrl = (trade.trade_screens?.[i] ?? '').trim();
                      if (screenUrl !== '') return;
                      const currentTf = (trade.trade_screen_timeframes?.[i] ?? '').trim();
                      if (currentTf === '') return;
                      const next = [...(trade.trade_screen_timeframes ?? ['', '', '', ''])];
                      next[i] = '';
                      updateTrade('trade_screen_timeframes', next);
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label htmlFor={`trade-screen-${i + 1}`} className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Trade Screen {i + 1}
                      </Label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {SCREEN_TIMEFRAME_OPTIONS.map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => {
                              const next = [...(trade.trade_screen_timeframes ?? ['', '', '', ''])];
                              if (tf === 'Custom') {
                                next[i] = isCustomTf ? currentTf : 'Custom';
                              } else {
                                next[i] = tf;
                              }
                              updateTrade('trade_screen_timeframes', next);
                              if (tf === 'Custom') {
                                setTimeout(() => customTfInputRefs.current[i]?.focus(), 0);
                              }
                            }}
                            className={`h-7 px-2 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer ${
                              (tf === 'Custom' && (currentTf === 'Custom' || isCustomTf)) ||
                              currentTf === tf
                                ? 'themed-header-icon-box shadow-sm border-transparent text-slate-50'
                                : 'border-slate-300/60 dark:border-slate-700/70 bg-slate-100/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:border-slate-400/70 dark:hover:border-slate-600/70'
                            }`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>
                    {(currentTf === 'Custom' || isCustomTf) && (
                      <Input
                        ref={(el) => {
                          customTfInputRefs.current[i] = el;
                        }}
                        type="text"
                        value={currentTf === 'Custom' ? '' : currentTf}
                        onChange={(e) => {
                          const next = [...(trade.trade_screen_timeframes ?? ['', '', '', ''])];
                          next[i] = e.target.value;
                          updateTrade('trade_screen_timeframes', next);
                        }}
                        onBlur={(e) => {
                          if (e.target.value.trim() !== '') return;
                          const next = [...(trade.trade_screen_timeframes ?? ['', '', '', ''])];
                          next[i] = '';
                          updateTrade('trade_screen_timeframes', next);
                        }}
                        className="h-9 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 themed-focus text-slate-900 dark:text-slate-50"
                        placeholder="Custom TF (e.g. 2H)"
                      />
                    )}
                    <Input
                      id={`trade-screen-${i + 1}`}
                      type="url"
                      value={trade.trade_screens?.[i] ?? ''}
                      onChange={(e) => {
                        const screens = [...(trade.trade_screens ?? ['', '', '', ''])];
                        screens[i] = e.target.value;
                        updateTrade('trade_screens', screens);
                      }}
                      className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                      placeholder="https://..."
                    />
                  </div>
                )})}
              </div>

              {showExtraScreens && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[2, 3].map((i) => {
                    const currentTf = (trade.trade_screen_timeframes?.[i] ?? '').trim();
                    const isCustomTf =
                      currentTf !== '' &&
                      !SCREEN_TIMEFRAME_PRESET_OPTIONS.includes(
                        currentTf as (typeof SCREEN_TIMEFRAME_PRESET_OPTIONS)[number]
                      );
                    return (
                    <div
                      key={i}
                      className="space-y-2"
                      onBlurCapture={(e) => {
                        const nextFocused = e.relatedTarget as Node | null;
                        if (nextFocused && e.currentTarget.contains(nextFocused)) return;
                        const screenUrl = (trade.trade_screens?.[i] ?? '').trim();
                        if (screenUrl !== '') return;
                        const currentTf = (trade.trade_screen_timeframes?.[i] ?? '').trim();
                        if (currentTf === '') return;
                        const next = [...(trade.trade_screen_timeframes ?? ['', '', '', ''])];
                        next[i] = '';
                        updateTrade('trade_screen_timeframes', next);
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label htmlFor={`trade-screen-${i + 1}`} className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Trade Screen {i + 1}
                        </Label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {SCREEN_TIMEFRAME_OPTIONS.map((tf) => (
                            <button
                              key={tf}
                              type="button"
                              onClick={() => {
                                const next = [...(trade.trade_screen_timeframes ?? ['', '', '', ''])];
                                if (tf === 'Custom') {
                                  next[i] = isCustomTf ? currentTf : 'Custom';
                                } else {
                                  next[i] = tf;
                                }
                                updateTrade('trade_screen_timeframes', next);
                                if (tf === 'Custom') {
                                  setTimeout(() => customTfInputRefs.current[i]?.focus(), 0);
                                }
                              }}
                              className={`h-7 px-2 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer ${
                                (tf === 'Custom' && (currentTf === 'Custom' || isCustomTf)) ||
                                currentTf === tf
                                  ? 'themed-header-icon-box shadow-sm border-transparent text-slate-50'
                                  : 'border-slate-300/60 dark:border-slate-700/70 bg-slate-100/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:border-slate-400/70 dark:hover:border-slate-600/70'
                              }`}
                            >
                              {tf}
                            </button>
                          ))}
                        </div>
                      </div>
                      {(currentTf === 'Custom' || isCustomTf) && (
                        <Input
                          ref={(el) => {
                            customTfInputRefs.current[i] = el;
                          }}
                          type="text"
                          value={currentTf === 'Custom' ? '' : currentTf}
                          onChange={(e) => {
                            const next = [...(trade.trade_screen_timeframes ?? ['', '', '', ''])];
                            next[i] = e.target.value;
                            updateTrade('trade_screen_timeframes', next);
                          }}
                          onBlur={(e) => {
                            if (e.target.value.trim() !== '') return;
                            const next = [...(trade.trade_screen_timeframes ?? ['', '', '', ''])];
                            next[i] = '';
                            updateTrade('trade_screen_timeframes', next);
                          }}
                          className="h-9 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 themed-focus text-slate-900 dark:text-slate-50"
                          placeholder="Custom TF (e.g. 2H)"
                        />
                      )}
                      <Input
                        id={`trade-screen-${i + 1}`}
                        type="url"
                        value={trade.trade_screens?.[i] ?? ''}
                        onChange={(e) => {
                          const screens = [...(trade.trade_screens ?? ['', '', '', ''])];
                          screens[i] = e.target.value;
                          updateTrade('trade_screens', screens);
                        }}
                        className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                        placeholder="https://..."
                      />
                    </div>
                  )})}
                </div>
              )}

              <div className="flex items-center gap-3">
                <Checkbox
                  id="need-more-screens"
                  checked={showExtraScreens}
                  onCheckedChange={(checked) => setShowExtraScreens(!!checked)}
                  className="themed-checkbox h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-150 data-[state=checked]:!text-white"
                />
                <Label htmlFor="need-more-screens" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300 select-none">
                  Need more?
                </Label>
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

            <MarketAndSetupSection
              market={trade.market}
              direction={trade.direction}
              tradeOutcome={trade.trade_outcome}
              session={trade.session}
              beFinalResult={trade.be_final_result}
              setupType={trade.setup_type}
              mss={trade.mss}
              fvgSize={trade.fvg_size}
              liquidity={trade.liquidity}
              displacementSize={trade.displacement_size}
              riskRewardRatio={trade.risk_reward_ratio}
              riskRewardRatioLong={trade.risk_reward_ratio_long}
              evaluation={trade.evaluation}
              trend={trade.trend}
              slSize={trade.sl_size}
              hasCard={hasCard}
              hasAnyExtraCard={hasAnyExtraCard}
              setupOptions={setupOptions}
              liquidityOptions={liquidityOptions}
              savedMarkets={settings.saved_markets}
              updateTrade={updateTrade}
              onTradeOutcomeChange={handleTradeOutcomeChange}
              onEditSavedMarket={handleEditSavedMarket}
              onEditSavedSetup={handleEditSavedSetup}
              onEditSavedLiquidity={handleEditSavedLiquidity}
              pinnedIdsMarket={currentStrategy?.saved_favourites?.market}
              onTogglePinMarket={currentStrategy ? handleToggleFavourite('market') : undefined}
              pinnedIdsSetup={currentStrategy?.saved_favourites?.setup}
              onTogglePinSetup={currentStrategy ? handleToggleFavourite('setup') : undefined}
              pinnedIdsLiquidity={currentStrategy?.saved_favourites?.liquidity}
              onTogglePinLiquidity={currentStrategy ? handleToggleFavourite('liquidity') : undefined}
            />

            {/* Risk Management Section */}
            <Separator />

            <RiskSection
              riskPerTrade={trade.risk_per_trade}
              riskRewardRatio={trade.risk_reward_ratio}
              pnlPercentage={pnlPercentage}
              signedProfit={signedProfit}
              currency={currency}
              updateTrade={updateTrade}
            />

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

              {/* News event + intensity — shown inline when News is checked */}
              {trade.news_related && (
                <div className="w-full mt-1 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="w-full max-w-[400px] min-w-0">
                    <NewsCombobox
                      id="news-name"
                      value={trade.news_name ?? ''}
                      onChange={(v) => updateTrade('news_name', v || null)}
                      onSelect={(item) => {
                        updateTrade('news_name', item.name);
                        updateTrade('news_intensity', item.intensity);
                      }}
                      savedNews={settings.saved_news as SavedNewsItem[]}
                      placeholder="e.g. CPI, NFP, FOMC"
                      className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                      onEditSavedNews={handleEditSavedNews}
                      pinnedIds={currentStrategy?.saved_favourites?.news}
                      onTogglePin={currentStrategy ? handleToggleFavourite('news') : undefined}
                    />
                  </div>
                  {/* Star rating 1–3 */}
                  <div className="flex items-center gap-1 shrink-0" role="group" aria-label="News intensity">
                    {[1, 2, 3].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          updateTrade('news_intensity', trade.news_intensity === star ? null : star)
                        }
                        className={`text-xl leading-none transition-colors cursor-pointer focus:outline-none ${
                          trade.news_intensity != null && star <= trade.news_intensity
                            ? 'text-amber-400'
                            : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
                        }`}
                        title={['Low', 'Medium', 'High'][star - 1]}
                        aria-pressed={trade.news_intensity != null && star <= trade.news_intensity}
                      >
                        ★
                      </button>
                    ))}
                    {trade.news_intensity != null && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                        {['Low', 'Medium', 'High'][trade.news_intensity - 1]}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {hasCard('local_hl_stats') && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="local-high-low"
                    checked={trade.local_high_low}
                    onCheckedChange={(checked) => updateTrade('local_high_low', checked as boolean)}
                    className="themed-checkbox h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-150 data-[state=checked]:!text-white"
                  />
                  <Label htmlFor="local-high-low" className="text-sm font-normal cursor-pointer">Local High/Low</Label>
                </div>
              )}

              {hasCard('launch_hour') && (
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
                      <p>Lunch Hour</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/60 dark:border-slate-600 shadow-sm">
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
                  {isSubmitting ? 'Creating new trade' : 'Create Trade'}
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              </Button>
            </div>
          </form>
        </div>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

interface MarketAndSetupSectionProps {
  market: Trade['market'];
  direction: Trade['direction'];
  tradeOutcome: Trade['trade_outcome'];
  session: Trade['session'];
  beFinalResult: Trade['be_final_result'];
  setupType: Trade['setup_type'];
  mss: Trade['mss'];
  fvgSize: Trade['fvg_size'];
  liquidity: Trade['liquidity'];
  displacementSize: Trade['displacement_size'];
  riskRewardRatio: Trade['risk_reward_ratio'];
  riskRewardRatioLong: Trade['risk_reward_ratio_long'];
  evaluation: Trade['evaluation'];
  trend: Trade['trend'];
  slSize: Trade['sl_size'];
  hasCard: (key: string) => boolean;
  hasAnyExtraCard: boolean;
  setupOptions: string[];
  liquidityOptions: string[];
  savedMarkets: string[] | undefined;
  updateTrade: <K extends keyof Trade>(key: K, value: Trade[K]) => void;
  onTradeOutcomeChange: (value: Trade['trade_outcome']) => void;
  onEditSavedMarket: (oldName: string, newName: string) => void | Promise<void>;
  onEditSavedSetup: (oldName: string, newName: string) => void | Promise<void>;
  onEditSavedLiquidity: (oldName: string, newName: string) => void | Promise<void>;
  pinnedIdsMarket?: string[];
  onTogglePinMarket?: (itemId: string) => void;
  pinnedIdsSetup?: string[];
  onTogglePinSetup?: (itemId: string) => void;
  pinnedIdsLiquidity?: string[];
  onTogglePinLiquidity?: (itemId: string) => void;
}

const MarketAndSetupSection = React.memo(function MarketAndSetupSection({
  market,
  direction,
  tradeOutcome,
  session,
  beFinalResult,
  setupType,
  mss,
  fvgSize,
  liquidity,
  displacementSize,
  riskRewardRatio,
  riskRewardRatioLong,
  evaluation,
  trend,
  slSize,
  hasCard,
  hasAnyExtraCard,
  setupOptions,
  liquidityOptions,
  savedMarkets,
  updateTrade,
  onTradeOutcomeChange,
  onEditSavedMarket,
  onEditSavedSetup,
  onEditSavedLiquidity,
  pinnedIdsMarket,
  onTogglePinMarket,
  pinnedIdsSetup,
  onTogglePinSetup,
  pinnedIdsLiquidity,
  onTogglePinLiquidity,
}: MarketAndSetupSectionProps) {
  // Local state to track FVG custom input while typing
  const [fvgInputValue, setFvgInputValue] = useState<string>(String(fvgSize ?? ''));

  useEffect(() => {
    // Sync local state when fvgSize prop changes (e.g., from blur validation)
    const timer = setTimeout(() => setFvgInputValue(String(fvgSize ?? '')), 0);
    return () => clearTimeout(timer);
  }, [fvgSize]);

  return (
    <>
      {/* Market & Direction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Trade Outcome *
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onTradeOutcomeChange('Win')}
              className={`h-12 rounded-2xl border transition-all duration-200 text-sm font-semibold cursor-pointer ${
                tradeOutcome === 'Win'
                  ? 'border-emerald-400/70 bg-emerald-500/20 text-slate-50 ring-2 ring-emerald-400/40'
                  : 'border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 hover:border-slate-300/80 dark:hover:border-slate-600/80'
              }`}
              aria-pressed={tradeOutcome === 'Win'}
            >
              Win
            </button>
            <button
              type="button"
              onClick={() => onTradeOutcomeChange('Lose')}
              className={`h-12 rounded-2xl border transition-all duration-200 text-sm font-semibold cursor-pointer ${
                tradeOutcome === 'Lose'
                  ? 'border-rose-400/70 bg-rose-500/25 text-slate-50 ring-2 ring-rose-400/40'
                  : 'border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 hover:border-slate-300/80 dark:hover:border-slate-600/80'
              }`}
              aria-pressed={tradeOutcome === 'Lose'}
            >
              Lose
            </button>
            <button
              type="button"
              onClick={() => onTradeOutcomeChange('BE')}
              className={`h-12 rounded-2xl border transition-all duration-200 text-sm font-semibold cursor-pointer ${
                tradeOutcome === 'BE'
                  ? 'border-orange-400/70 bg-orange-500/20 text-slate-50 ring-2 ring-orange-400/40'
                  : 'border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 hover:border-slate-300/80 dark:hover:border-slate-600/80'
              }`}
              aria-pressed={tradeOutcome === 'BE'}
            >
              BE
            </button>
          </div>

          {tradeOutcome === 'BE' && (
            <div className="space-y-2">
              <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                After BE
              </Label>
              <Select
                value={beFinalResult ?? '__none__'}
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
        <div className="space-y-2">
          <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Direction *</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateTrade('direction', 'Long')}
              className={`h-12 rounded-2xl border transition-all duration-200 text-sm font-semibold cursor-pointer ${
                direction === 'Long'
                  ? 'border-emerald-400/70 bg-emerald-500/20 text-slate-50 ring-2 ring-emerald-400/40'
                  : 'border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 hover:border-slate-300/80 dark:hover:border-slate-600/80'
              }`}
              aria-pressed={direction === 'Long'}
            >
              <span className="inline-flex items-center gap-2">
                <span className="text-emerald-500 dark:text-emerald-400 text-xs">↑</span>
                <span>Long</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => updateTrade('direction', 'Short')}
              className={`h-12 rounded-2xl border transition-all duration-200 text-sm font-semibold cursor-pointer ${
                direction === 'Short'
                  ? 'border-rose-400/70 bg-rose-500/25 text-slate-50 ring-2 ring-rose-400/40'
                  : 'border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 hover:border-slate-300/80 dark:hover:border-slate-600/80'
              }`}
              aria-pressed={direction === 'Short'}
            >
              <span className="inline-flex items-center gap-2">
                <span className="text-rose-500 dark:text-rose-400 text-xs">↓</span>
                <span>Short</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Outcome + conditioned fields from extra cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label
            htmlFor="market"
            className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            Market *
          </Label>
          <MarketCombobox
            id="market"
            value={market}
            onChange={(v) => updateTrade('market', v)}
            onBlur={() => {
              const normalized = normalizeMarket(market);
              if (normalized !== market) updateTrade('market', normalized);
            }}
            placeholder="Type market (e.g. EURUSD, EUR/USD)"
            className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            dropdownClassName="z-[100]"
            defaultSuggestions={savedMarkets}
            onEditSavedMarket={onEditSavedMarket}
            pinnedIds={pinnedIdsMarket}
            onTogglePin={onTogglePinMarket}
          />
        </div>

        {/* Session (manual tag) */}
        <div className="space-y-2">
          <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Session *
          </Label>
          <Select
            value={session ?? ''}
            onValueChange={(v) => updateTrade('session', v as any)}
          >
            <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {SESSION_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* All hasCard-conditioned fields now share this same parent grid so rows realign automatically when cards are enabled/disabled. */}
        {hasCard('setup_stats') && (
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Pattern / Setup *
            </Label>
            <CommonCombobox
              id="setup-type"
              value={setupType ?? ''}
              onChange={(v) => updateTrade('setup_type', v as any)}
              options={setupOptions}
              customValueLabel="pattern / setup"
              placeholder="Select or type pattern / setup"
              dropdownClassName="z-[100]"
              onEditSavedOption={onEditSavedSetup}
              pinnedIds={pinnedIdsSetup}
              onTogglePin={onTogglePinSetup}
            />
          </div>
        )}

        {hasCard('mss_stats') && (
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              MSS *
            </Label>
            <Select value={mss} onValueChange={(v) => updateTrade('mss', v)}>
              <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                <SelectValue placeholder="Select MSS" />
              </SelectTrigger>
              <SelectContent>
                {MSS_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {hasCard('fvg_size') && (
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              FVG Size *
            </Label>
            <Select
              value={
                fvgSize == null || fvgSize === undefined
                  ? ''
                  : FVG_SIZE_PRESET_VALUES.includes(fvgSize)
                  ? String(fvgSize)
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
            {fvgSize != null &&
              !FVG_SIZE_PRESET_VALUES.includes(fvgSize) && (
                <div className="pt-1">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={fvgInputValue}
                    onChange={(e) => {
                      // Just update display value, allow anything while typing
                      setFvgInputValue(e.target.value);
                    }}
                    onBlur={(e) => {
                      const text = e.target.value;
                      const raw = parseFloat(text);
                      if (Number.isNaN(raw) || text === '' || raw < FVG_SIZE_CUSTOM_MIN) {
                        // Invalid: restore previous valid value
                        setFvgInputValue(String(fvgSize ?? FVG_SIZE_CUSTOM_MIN));
                        return;
                      }
                      const snapped = snapToHalfStep(raw);
                      const clamped =
                        snapped < FVG_SIZE_CUSTOM_MIN ? FVG_SIZE_CUSTOM_MIN : snapped;
                      updateTrade('fvg_size', clamped);
                      // Local state will sync via useEffect when fvgSize updates
                    }}
                    className="h-10 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 themed-focus text-slate-900 dark:text-slate-50"
                    placeholder="e.g. 3.5, 4, 4.5"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Only 0.5 steps from 3.5 onward (e.g. 3.5, 4, 4.5). Values are rounded to
                    nearest 0.5.
                  </p>
                </div>
              )}
          </div>
        )}

        {hasCard('liquidity_stats') && (
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Conditions / Liquidity *
            </Label>
            <CommonCombobox
              id="liquidity"
              value={liquidity ?? ''}
              onChange={(v) => updateTrade('liquidity', v)}
              options={liquidityOptions}
              defaultSuggestions={liquidityOptions}
              customValueLabel="conditions / liquidity"
              placeholder="Select or type conditions / liquidity"
              dropdownClassName="z-[100]"
              onEditSavedOption={onEditSavedLiquidity}
              pinnedIds={pinnedIdsLiquidity}
              onTogglePin={onTogglePinLiquidity}
            />
          </div>
        )}

        {(hasCard('displacement_size') || hasCard('avg_displacement')) && (
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Displacement Size (Points) *
            </Label>
            <Input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={String(displacementSize ?? '')}
              onChange={(e) =>
                updateTrade('displacement_size', parseFloat(e.target.value) || 0)
              }
              className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
              placeholder="Displacement"
            />
          </div>
        )}

        {hasCard('sl_size_stats') && (
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              SL Size *
            </Label>
            <Input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={String(slSize ?? '')}
              onChange={(e) => updateTrade('sl_size', parseFloat(e.target.value) || 0)}
              className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
              placeholder="e.g. 10"
            />
          </div>
        )}

        {hasCard('potential_rr') && (
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Potential R:R *
            </Label>
            {tradeOutcome === 'Lose' || tradeOutcome === 'BE' ? (
              <Input
                type="text"
                value="0"
                readOnly
                className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-200/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 cursor-not-allowed"
              />
            ) : (
              <Select
                disabled={!tradeOutcome || Number(riskRewardRatio ?? 0) <= 0}
                value={
                  riskRewardRatioLong && riskRewardRatioLong > 0
                    ? String(riskRewardRatioLong)
                    : undefined
                }
                onValueChange={(v) =>
                  updateTrade(
                    'risk_reward_ratio_long',
                    v === '' || v === '__none__' ? (undefined as any) : Number(v),
                  )
                }
              >
                <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  <SelectValue placeholder={
                    !tradeOutcome
                      ? 'Select Trade Outcome first'
                      : Number(riskRewardRatio ?? 0) <= 0
                      ? 'Set R:R Ratio first'
                      : 'Select ratio (1 – 10 or 10+)'
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No potential R:R</SelectItem>
                  {POTENTIAL_RR_OPTIONS
                    .filter((opt) => {
                      if (tradeOutcome !== 'Win') return true;
                      const baseValue = Number(riskRewardRatio ?? 0);
                      // Only show options strictly higher than the RR ratio (minimum +0.5).
                      // When RR is not set (0), no preset options are valid yet.
                      return baseValue > 0 && opt.value > baseValue;
                    })
                    .map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {hasCard('evaluation_stats') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Evaluation Grade *
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 cursor-help text-slate-500 dark:text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent className="w-64 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5">
                      Grade guide
                    </p>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                      <li className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-blue-500/15 dark:bg-blue-400/20 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                          A+
                        </span>
                        <span>Perfect execution</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-emerald-500/15 dark:bg-emerald-400/20 flex items-center justify-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          A
                        </span>
                        <span>Excellent trade</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-amber-500/15 dark:bg-amber-400/20 flex items-center justify-center text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                          B
                        </span>
                        <span>Good trade</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-orange-500/15 dark:bg-orange-400/20 flex items-center justify-center text-[10px] font-bold text-orange-600 dark:text-orange-400 shrink-0">
                          C
                        </span>
                        <span>Poor execution</span>
                      </li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={evaluation} onValueChange={(v) => updateTrade('evaluation', v)}>
              <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                <SelectValue placeholder="Select Grade" />
              </SelectTrigger>
              <SelectContent>
                {EVALUATION_OPTIONS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {hasCard('trend_stats') && (
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Trend *
            </Label>
            <Select
              value={trend ?? ''}
              onValueChange={(v) => updateTrade('trend', v || null)}
            >
              <SelectTrigger className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                <SelectValue placeholder="Select Trend" />
              </SelectTrigger>
                <SelectContent>
                <SelectItem value="Trend-following">Trend-following</SelectItem>
                <SelectItem value="Counter-trend">Counter-trend</SelectItem>
                <SelectItem value="Consolidation">Consolidation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </>
  );
});

interface RiskSectionProps {
  riskPerTrade: Trade['risk_per_trade'];
  riskRewardRatio: Trade['risk_reward_ratio'];
  pnlPercentage: number;
  signedProfit: number;
  currency: string;
  updateTrade: <K extends keyof Trade>(key: K, value: Trade[K]) => void;
}

const RiskSection = React.memo(function RiskSection({
  riskPerTrade,
  riskRewardRatio,
  pnlPercentage,
  signedProfit,
  currency,
  updateTrade,
}: RiskSectionProps) {
  return (
    <>
      <div className="space-y-5">
        {/* Row 1: core risk inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Risk per Trade (%) *
            </Label>
            <Input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={String(riskPerTrade ?? '')}
              onChange={(e) =>
                updateTrade('risk_per_trade', parseFloat(e.target.value) || 0)
              }
              className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
              placeholder="e.g. 1.5"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              R:R Ratio *
            </Label>
            <Input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={String(riskRewardRatio ?? '')}
              onChange={(e) =>
                updateTrade('risk_reward_ratio', parseFloat(e.target.value) || 0)
              }
              className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
              placeholder="e.g. 2"
              required
            />
          </div>
        </div>
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
              {pnlPercentage >= 0 ? '+' : ''}
              {pnlPercentage.toFixed(2)}%
            </Badge>
            <span
              className={`text-xl font-bold ${
                pnlPercentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {currency}
              {signedProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
});
