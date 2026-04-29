'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { isSafeUrl } from '@/utils/isSafeUrl';
import { SESSION_PALETTE } from '@/constants/sessionPalette';
import { useProgressDialog } from '@/hooks/useProgressDialog';
import { useParams } from 'next/navigation';
import { Trade } from '@/types/trade';
import { deleteTrade, updateTrade } from '@/lib/server/trades';
import { useQueryClient } from '@tanstack/react-query';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useStrategies } from '@/hooks/useStrategies';
import { Loader2, Info, Check, Share2 } from 'lucide-react';
import { AfterBreakEvenSelect } from '@/components/trade/AfterBreakEvenSelect';
import { TradeDirectionChips } from '@/components/trade/TradeDirectionChips';
import { TradeOutcomeChips } from '@/components/trade/TradeOutcomeChips';
import { TradeScreenSlotEditor } from '@/components/trade/TradeScreenSlotEditor';
import {
  EVALUATION_OPTIONS,
  MSS_OPTIONS,
  POTENTIAL_RR_OPTIONS,
  SESSION_OPTIONS,
} from '@/constants/tradeFormOptions';

// Shared input/select styles to match NewTradeModal (themed, rounded-2xl)
const inputClass =
  'h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300';
const selectTriggerClass =
  'h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300';
// Match CommonCombobox dropdown styling so all edit-mode selects share the same themed surface
const selectContentClass =
  'z-[100] max-h-56 overflow-auto rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 shadow-lg backdrop-blur-sm';
const labelClass = 'block text-sm font-semibold text-slate-700 dark:text-slate-300';

const DAY_OF_WEEK_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TREND_OPTIONS = ['Trend-following', 'Counter-trend', 'Consolidation'];

const CONFIDENCE_LABELS: Record<number, string> = { 1: 'Very low', 2: 'Low', 3: 'Neutral', 4: 'Good', 5: 'Very confident' };
const MIND_STATE_LABELS: Record<number, string> = { 1: 'Very poor', 2: 'Poor', 3: 'Neutral', 4: 'Good', 5: 'Very good' };
const NEWS_INTENSITY_LABELS: Record<number, string> = { 1: 'Low', 2: 'Medium', 3: 'High' };

// shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Checkbox } from "@/components/ui/checkbox";
import { getMarketValidationError, normalizeMarket } from '@/utils/validateMarket';
import { calculateTradePnl } from '@/utils/helpers/tradePnlCalculator';
import { getFuturesSpec } from '@/constants/futuresSpecs';
import { getCurrencySymbolFromAccount } from '@/utils/accountOverviewHelpers';
import { MarketCombobox } from '@/components/MarketCombobox';
import { TIME_INTERVALS, getIntervalForTime } from '@/constants/analytics';
import { NewsCombobox } from '@/components/NewsCombobox';
import { CommonCombobox } from '@/components/CommonCombobox';
import { constructUpdateTradePayload } from '@/utils/constructTradePayload';
import { useTradeSaveFlow } from '@/hooks/useTradeSaveFlow';
import { formatPotentialRR, snapToHalfStep } from '@/utils/tradeFormHelpers';
import { queryKeys } from '@/lib/queryKeys';
import type { SavedNewsItem } from '@/types/account-settings';
import { useSettings } from '@/hooks/useSettings';
import { updateStrategyFavourites, updateTagColor } from '@/lib/server/strategies';
import type { Strategy, SavedFavouritesKind } from '@/types/strategy';
import { TagInput } from '@/components/ui/TagInput';
import type { SavedTag, TagColor } from '@/types/saved-tag';
import { resolveTagColorStyle } from '@/constants/tagColors';
import { ShareTradeModal } from '@/components/ShareTradeModal';

interface TradeDetailsPanelProps {
  trade: Trade | null;
  onClose: () => void;
  onTradeUpdated?: () => void;
  /** When true, the panel stays open after saving (split-view mode) */
  inlineMode?: boolean;
  /** When true, no edit/delete actions; view-only (e.g. public share). */
  readOnly?: boolean;
  /** Strategy name to show in top-right header (e.g. shared strategy name). */
  strategyName?: string;
  /** Extra card keys to show in read-only mode (e.g. from public share page where no auth session exists). */
  extraCards?: string[];
  /** Strategy's saved tag vocabulary for autocomplete. Pass [] for read-only contexts. */
  savedTags?: SavedTag[];
  /**
   * When true, the panel renders for page-level use (e.g. public share page).
   * Drops the internal scroll container (`flex-1 overflow-y-auto`) so the browser
   * window scrolls naturally. Default `false` preserves sidebar/sheet behavior.
   */
  pageMode?: boolean;
}

export default function TradeDetailsPanel({ trade, onClose, onTradeUpdated, inlineMode, readOnly = false, strategyName: strategyNameProp, extraCards: extraCardsProp, savedTags: savedTagsProp = [], pageMode = false }: TradeDetailsPanelProps) {
  const params = useParams();
  const strategySlug = (params?.strategy as string | undefined) ?? '';
  const { selection } = useActionBarSelection();
  const accountId = selection.activeAccount?.id;
  const { data: userData } = useUserDetails();
  const userId = userData?.user?.id;
  const { strategies } = useStrategies({ userId, accountId });
  // Derive extra_cards from the current strategy
  const currentStrategy = useMemo(
    () => strategies.find((s) => s.slug === strategySlug),
    [strategies, strategySlug]
  );
  // In read-only mode (e.g. public share page), there's no auth session so useStrategies
  // returns empty — use the extraCards prop directly when provided.
  const strategyExtraCards = useMemo(
    () => (readOnly && extraCardsProp != null) ? extraCardsProp : (currentStrategy?.extra_cards ?? []),
    [readOnly, extraCardsProp, currentStrategy?.extra_cards]
  );
  const hasCard = useCallback(
    (key: string) => (strategyExtraCards as readonly string[]).includes(key),
    [strategyExtraCards]
  );
  const { settings } = useSettings({ userId });
  const [isEditing, setIsEditing] = useState(false);
  const [editedTrade, setEditedTrade] = useState<Trade | null>(trade);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { error, setError } = useProgressDialog(5000);
  const [showExtraScreens, setShowExtraScreens] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const queryClient = useQueryClient();

  // Account type comes from the active account when the user is authenticated.
  // On public share pages there is no signed-in active account, so we fall back
  // to deriving it from the trade itself: any trade with a non-null contract
  // count or spec_source must be futures (set at write time by tradePnlCalculator).
  // This keeps the share-trade page rendering Contracts / SL units correctly.
  const accountTypeFromAccount: 'standard' | 'futures' | null =
    (selection.activeAccount as { account_type?: string } | null)?.account_type === 'futures'
      ? 'futures'
      : selection.activeAccount
        ? 'standard'
        : null;
  const accountTypeFromTrade: 'standard' | 'futures' =
    (typeof trade?.num_contracts === 'number' && trade.num_contracts > 0) ||
    trade?.spec_source != null
      ? 'futures'
      : 'standard';
  const accountType: 'standard' | 'futures' = accountTypeFromAccount ?? accountTypeFromTrade;
  const accountBalanceRef = useRef(selection.activeAccount?.account_balance || 0);
  const accountTypeRef = useRef<'standard' | 'futures'>(accountType);
  const customTfInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const panelContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    accountBalanceRef.current = selection.activeAccount?.account_balance || 0;
    accountTypeRef.current = accountType;
  }, [selection.activeAccount, accountType]);

  const customFuturesSpecs = useMemo(
    () => settings.custom_futures_specs ?? [],
    [settings.custom_futures_specs],
  );
  const customFuturesSpecsRef = useRef(customFuturesSpecs);
  useEffect(() => {
    customFuturesSpecsRef.current = customFuturesSpecs;
  }, [customFuturesSpecs]);

  // Resolve the futures contract spec for the current market so we can label
  // sl_size with the correct unit (e.g. "22 points" vs "22 ticks"). Falls back
  // to null for non-futures accounts, unknown markets, or per-trade overrides.
  const resolvedFuturesSpec = useMemo(() => {
    if (accountType !== 'futures' || !editedTrade?.market) return null;
    return getFuturesSpec(editedTrade.market, customFuturesSpecs);
  }, [accountType, editedTrade?.market, customFuturesSpecs]);
  const slUnitLabel = resolvedFuturesSpec?.spec.slUnitLabel ?? null;

  const currencySymbol = useMemo(
    () => getCurrencySymbolFromAccount(selection.activeAccount ?? undefined),
    [selection.activeAccount],
  );

  const { runPostSaveSync, invalidateTradeCache } = useTradeSaveFlow({
    userId,
    accountId,
    mode: selection.mode,
    settings,
    currentStrategy,
  });

  // Auto-reveal extra screens if trade has slots 3 or 4 filled
  useEffect(() => {
    if (editedTrade?.trade_screens?.[2] || editedTrade?.trade_screens?.[3]) {
      const timer = setTimeout(() => setShowExtraScreens(true), 0);
      return () => clearTimeout(timer);
    }
  }, [editedTrade?.id, editedTrade?.trade_screens]);

  // Sync editedTrade when trade prop changes (when not editing)
  useEffect(() => {
    if (trade && !isEditing && trade !== editedTrade) {
      const timer = setTimeout(() => setEditedTrade(trade), 0);
      return () => clearTimeout(timer);
    }
  }, [trade, isEditing, editedTrade]);


  const setupOptions = useMemo(() => currentStrategy?.saved_setup_types ?? [], [currentStrategy?.saved_setup_types]);
  const liquidityOptions = useMemo(
    () => Array.from(new Set(['HOD', 'LOD', ...(currentStrategy?.saved_liquidity_types ?? [])])),
    [currentStrategy?.saved_liquidity_types]
  );
  const displacementSizeOptions = currentStrategy?.saved_displacement_sizes ?? [];
  const slSizeOptions = currentStrategy?.saved_sl_sizes ?? [];
  const riskPerTradeOptions = currentStrategy?.saved_risk_per_trades ?? [];
  const rrRatioOptions = currentStrategy?.saved_rr_ratios ?? [];

  const strategyNameFromStrategies = useMemo(
    () => strategies.find((s) => s.id === editedTrade?.strategy_id)?.name ?? '—',
    [strategies, editedTrade?.strategy_id]
  );
  const strategyName = readOnly && strategyNameProp != null ? strategyNameProp : strategyNameFromStrategies;

  const effectiveIsEditing = readOnly ? false : isEditing;

  const handleInputChange = (field: keyof Trade, value: string | number | boolean | string[] | null | undefined) => {
    setEditedTrade((prev) => {
      if (!prev) return prev;

      // Per plan OV8: snapshot semantics — only recompute when a futures-relevant input changes.
      // For standard accounts the trigger set is the same it has always been.
      const FUTURES_RECOMPUTE_FIELDS: ReadonlyArray<keyof Trade> = [
        'risk_per_trade',
        'risk_reward_ratio',
        'trade_outcome',
        'num_contracts',
        'sl_size',
        'dollar_per_sl_unit_override',
        'partials_taken',
        'break_even',
        'market',
      ];

      if (FUTURES_RECOMPUTE_FIELDS.includes(field)) {
        const newRisk = field === 'risk_per_trade' ? value : prev.risk_per_trade;
        const newRR = field === 'risk_reward_ratio' ? value : prev.risk_reward_ratio;
        const newOutcome = field === 'trade_outcome' ? String(value) : prev.trade_outcome;
        const nextBreakEven = field === 'trade_outcome' ? value === 'BE' : prev.break_even;
        const newContracts = field === 'num_contracts' ? value : prev.num_contracts;
        const newSlSize = field === 'sl_size' ? value : prev.sl_size;
        const newOverride = field === 'dollar_per_sl_unit_override' ? value : prev.dollar_per_sl_unit_override;
        const newPartials = field === 'partials_taken' ? Boolean(value) : prev.partials_taken;
        const newMarket = field === 'market' ? String(value ?? '') : prev.market;

        let computed: ReturnType<typeof calculateTradePnl>;
        try {
          computed = calculateTradePnl(
            {
              trade_outcome: newOutcome,
              risk_per_trade: Number(newRisk),
              risk_reward_ratio: Number(newRR),
              break_even: nextBreakEven,
              partials_taken: newPartials,
              market: newMarket,
              sl_size: typeof newSlSize === 'number' ? newSlSize : Number(newSlSize) || undefined,
              num_contracts: typeof newContracts === 'number' ? newContracts : (newContracts == null ? null : Number(newContracts)),
              dollar_per_sl_unit_override:
                typeof newOverride === 'number' ? newOverride : (newOverride == null ? null : Number(newOverride)),
            },
            { balance: accountBalanceRef.current, type: accountTypeRef.current },
            customFuturesSpecsRef.current,
          );
        } catch {
          // MissingFuturesSpecError — preserve prior snapshot until user provides a multiplier.
          computed = {
            pnl_percentage: prev.pnl_percentage ?? 0,
            calculated_profit: prev.calculated_profit ?? 0,
            calculated_risk_dollars: prev.calculated_risk_dollars ?? null,
            spec_source: prev.spec_source ?? null,
          };
        }

        const nextState: Trade = {
          ...prev,
          [field]: value,
          calculated_profit: computed.calculated_profit,
          pnl_percentage: computed.pnl_percentage,
          calculated_risk_dollars: computed.calculated_risk_dollars,
          spec_source: computed.spec_source,
        };
        if (field === 'trade_outcome' && (value === 'Lose' || value === 'BE')) {
          nextState.risk_reward_ratio_long = 0;
        }
        // When RR ratio changes with Win outcome, clear Potential RR if it's no longer valid
        if (field === 'risk_reward_ratio' && prev.trade_outcome === 'Win') {
          const newRRValue = Number(value);
          if (prev.risk_reward_ratio_long != null && Number(prev.risk_reward_ratio_long) <= newRRValue) {
            nextState.risk_reward_ratio_long = undefined;
          }
        }
        if (field === 'trade_outcome') {
          nextState.break_even = value === 'BE';
          if (value !== 'BE') nextState.be_final_result = null;
        }
        return nextState;
      } else {
        return { ...prev, [field]: value };
      }
    });
  };

  const handleSave = async () => {
    if (!editedTrade || !editedTrade.id) return;
    setError(null);

    const marketError = getMarketValidationError(editedTrade.market);
    if (marketError) {
      setError(marketError);
      return;
    }

    setIsSaving(true);

    try {
      const tradingMode = (editedTrade.mode || selection.mode) as 'live' | 'backtesting' | 'demo';
      const updateData = constructUpdateTradePayload(editedTrade);

      const { error: updateError } = await updateTrade(editedTrade.id, tradingMode, updateData);

      if (updateError) {
        setError(updateError.message === 'RATE_LIMIT_EXCEEDED'
          ? 'Too many requests. Please wait a moment and try again.'
          : 'Failed to update trade. Please try again.');
        setIsSaving(false);
        return;
      }

      // Update UI immediately — don't wait for refetch
      setIsEditing(false);
      if (onTradeUpdated) onTradeUpdated();
      setIsSaving(false);
      // In inline/split mode, stay on the panel after saving; in modal mode, close
      if (!inlineMode) onClose();

      // Refetch + sync saved lists + cache in background
      void runPostSaveSync({
        trade: editedTrade,
        strategyIds: [trade?.strategy_id ?? null, editedTrade.strategy_id ?? null],
        onSyncError: (msg) => setError(msg),
      });
    } catch (err: unknown) {
      setError('Failed to save trade. Please try again.');
      setIsSaving(false);
    }
  };

  const handleToggleFavourite = (kind: SavedFavouritesKind) => (itemId: string) => {
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
  };

  const handleDelete = async () => {
    if (!trade || !trade.id) return;
    setShowDeleteConfirm(false);
    setError(null);
    setIsDeleting(true);

    try {
      const tradingMode = (trade.mode || selection.mode) as 'live' | 'backtesting' | 'demo';
      const { error: deleteError } = await deleteTrade(trade.id, tradingMode);

      if (deleteError) {
        setError(deleteError.message === 'RATE_LIMIT_EXCEEDED'
          ? 'Too many requests. Please wait a moment and try again.'
          : 'Failed to delete trade. Please try again.');
        setIsDeleting(false);
        return;
      }

      setIsDeleting(false);
      if (onTradeUpdated) onTradeUpdated();
      onClose();

      // Refetch in background
      void invalidateTradeCache([trade?.strategy_id ?? null]);
    } catch (err: unknown) {
      setShowDeleteConfirm(false);
      setError('Failed to delete trade. Please try again.');
      setIsDeleting(false);
    }
  };

  const renderStatusBadge = (value: boolean | string) => {
    const isActive = typeof value === 'boolean' ? value : value === 'Yes';
    return (
      <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-lg ${
        isActive
          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
      }`}>
        {isActive ? 'Yes' : 'No'}
      </span>
    );
  };

  const renderOutcomeBadge = (outcome: string) => {
    const colors: Record<string, string> = {
      'Win': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      'Lose': 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      'BE': 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      'Break Even': 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    };
    return (
      <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-lg ${
        colors[outcome] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
      }`}>
        {outcome}
      </span>
    );
  };

  const renderOutcomeBadges = (outcome: string, beFinalResult?: string | null) => {
    if (outcome === 'BE' || outcome === 'Break Even') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          {renderOutcomeBadge(outcome)}
          {beFinalResult ? renderOutcomeBadge(beFinalResult) : null}
        </div>
      );
    }
    return renderOutcomeBadge(outcome);
  };

  const renderField = (
    label: string,
    field: keyof Trade,
    type: 'text' | 'number' | 'select' | 'boolean' | 'outcome' | 'market' = 'text',
    options?: readonly string[]
  ) => {
    if (!editedTrade) return null;
    const value = editedTrade[field];

    if (!effectiveIsEditing) {
      if (type === 'boolean') {
        return (
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</dt>
            <dd className="mt-1.5">{renderStatusBadge(value as boolean)}</dd>
          </div>
        );
      }
      if (type === 'outcome') {
        const outcome = value as string;
        return (
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</dt>
            <dd className="mt-1.5">{renderOutcomeBadges(outcome, editedTrade.be_final_result)}</dd>
          </div>
        );
      }
      if (type === 'number') {
        const displayValue =
          typeof value === 'number'
            ? field === 'num_contracts'
              ? String(Math.trunc(value)) // contracts are whole units
              : value.toFixed(2)
            : value;

        // Futures: append the unit (e.g. "22 points" / "22 ticks") so the trader
        // can see at a glance whether sl_size is in ticks or points.
        if (field === 'sl_size' && slUnitLabel && typeof value === 'number') {
          return (
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</dt>
              <dd className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {displayValue}
                <span className="ml-1 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  {slUnitLabel}
                </span>
              </dd>
            </div>
          );
        }
        if (field === 'risk_reward_ratio_long') {
          return (
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</dt>
              <dd className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatPotentialRR(value as number)}
                <span className="ml-0.5 text-[10px] text-slate-400 dark:text-slate-500">R</span>
              </dd>
            </div>
          );
        }
        if (field === 'risk_reward_ratio') {
          return (
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</dt>
              <dd className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {displayValue}
                <span className="ml-0.5 text-[10px] text-slate-400 dark:text-slate-500">R</span>
              </dd>
            </div>
          );
        }
        if (field === 'pnl_percentage' || field === 'risk_per_trade' || field === 'displacement_size' || field === 'fvg_size') {
          return (
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</dt>
              <dd className={
                `mt-1.5 text-sm font-semibold ${
                  field === 'pnl_percentage'
                    ? (editedTrade.trade_outcome === 'Lose'
                      ? 'text-red-500 dark:text-red-400'
                      : editedTrade.trade_outcome === 'BE'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-emerald-500 dark:text-emerald-400')
                    : 'text-slate-900 dark:text-slate-100'
                }`
              }>
                {field === 'pnl_percentage' || field === 'risk_per_trade'
                  ? `${displayValue}%`
                  : displayValue}
              </dd>
            </div>
          );
        }
        return (
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</dt>
            <dd className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{displayValue}</dd>
          </div>
        );
      }
      if (field === 'trade_time') {
        const interval = getIntervalForTime((value as string) || '');
        const displayTime = interval ? interval.label : (value as string) || '—';
        return (
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</dt>
            <dd className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{displayTime}</dd>
          </div>
        );
      }
      if (field === 'direction') {
        const dir = value as string | null | undefined;
        return (
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</dt>
            <dd className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {dir === 'Long' ? (
                <span className="inline-flex items-center gap-1">
                  <span className="text-emerald-500 dark:text-emerald-400 text-xs">↑</span>
                  <span>Long</span>
                </span>
              ) : dir === 'Short' ? (
                <span className="inline-flex items-center gap-1">
                  <span className="text-rose-500 dark:text-rose-400 text-xs">↓</span>
                  <span>Short</span>
                </span>
              ) : (
                <span>{dir ?? '—'}</span>
              )}
            </dd>
          </div>
        );
      }
      return (
        <div>
          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</dt>
          <dd className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{value as string}</dd>
        </div>
      );
    }

    if (field === 'trade_time') {
      const timeStr = (editedTrade.trade_time as string) || '';
      const intervalForDisplay = getIntervalForTime(timeStr);
      const selectValue = intervalForDisplay ? intervalForDisplay.start : timeStr || '';
      return (
        <div>
          <label className={`${labelClass} mb-2`}>{label}</label>
          <Select
            value={TIME_INTERVALS.some((i) => i.start === selectValue) ? selectValue : ''}
            onValueChange={(v) => handleInputChange('trade_time', v)}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Select time interval" />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              {TIME_INTERVALS.map((interval) => (
                <SelectItem key={interval.start} value={interval.start}>
                  {interval.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field === 'direction') {
      const currentDirection = (value as string) ?? '';
      return (
        <div>
          <label className={`${labelClass} mb-2`}>{label}</label>
          <TradeDirectionChips
            value={currentDirection}
            onChange={(direction) => handleInputChange('direction', direction)}
          />
        </div>
      );
    }

    if (field === 'pnl_percentage') {
      const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
      const displayValue = numValue.toFixed(2);
      return (
        <div>
          <label className={`${labelClass} mb-2`}>{label}</label>
          <Input
            type="text"
            value={`${displayValue}%`}
            readOnly
            className={`${inputClass} bg-slate-200/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 cursor-not-allowed`}
          />
        </div>
      );
    }

    if (field === 'risk_per_trade') {
      const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
      const displayValue = numValue.toFixed(2);
      if (effectiveIsEditing) {
        const num = value != null && !isNaN(Number(value)) ? Number(value) : null;
        return (
          <div>
            <label className={`${labelClass} mb-2`}>{label}</label>
            <CommonCombobox
              value={num !== null ? String(num) : ''}
              onChange={(v) => {
                const trimmed = v.trim();
                if (trimmed === '') {
                  handleInputChange(field, '');
                  return;
                }
                const n = parseFloat(trimmed);
                handleInputChange(field, Number.isFinite(n) ? n : '');
              }}
              options={riskPerTradeOptions}
              defaultSuggestions={riskPerTradeOptions}
              customValueLabel="risk per trade"
              placeholder="e.g. 1.5"
              dropdownClassName="z-[100]"
              inputMode="decimal"
              pinnedIds={currentStrategy?.saved_favourites?.risk_per_trade}
              onTogglePin={currentStrategy ? handleToggleFavourite('risk_per_trade') : undefined}
            />
          </div>
        );
      } else {
        return (
          <div>
            <label className={`${labelClass} mb-2`}>{label}</label>
            <Input
              type="text"
              value={`${displayValue}%`}
              readOnly
              className={`${inputClass} bg-slate-200/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 cursor-not-allowed`}
            />
          </div>
        );
      }
    }

    if (field === 'risk_reward_ratio_long') {
      if (editedTrade.trade_outcome === 'Lose' || editedTrade.trade_outcome === 'BE') {
        return (
          <div>
            <label className={`${labelClass} mb-2`}>{label}</label>
            <Input
              type="text"
              value="0"
              readOnly
              className={`${inputClass} bg-slate-200/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 cursor-not-allowed`}
            />
          </div>
        );
      }
      const rrBase = Number(editedTrade.risk_reward_ratio ?? 0);
      const isWin = editedTrade.trade_outcome === 'Win';
      // Treat current value as unselected if it's not strictly greater than RR ratio (for Win outcome)
      const currentValue =
        editedTrade.risk_reward_ratio_long != null &&
        editedTrade.risk_reward_ratio_long > 0 &&
        (!isWin || Number(editedTrade.risk_reward_ratio_long) > rrBase)
          ? String(editedTrade.risk_reward_ratio_long)
          : '';
      return (
        <div>
          <label className={`${labelClass} mb-2`}>{label}</label>
          <Select
            value={currentValue}
            onValueChange={(v) => handleInputChange('risk_reward_ratio_long', v === '' ? undefined : Number(v))}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              {POTENTIAL_RR_OPTIONS
                .filter((opt) => !isWin || opt.value > rrBase)
                .map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field === 'displacement_size') {
      const num = value != null && !isNaN(Number(value)) ? Number(value) : null;
      return (
        <div>
          <label className={`${labelClass} mb-2`}>{label}</label>
          <CommonCombobox
            value={num !== null ? String(num) : ''}
            onChange={(v) => {
              const trimmed = v.trim();
              if (trimmed === '') {
                handleInputChange(field, '');
                return;
              }
              const n = parseFloat(trimmed);
              handleInputChange(field, Number.isFinite(n) ? n : '');
            }}
            options={displacementSizeOptions}
            defaultSuggestions={displacementSizeOptions}
            customValueLabel="displacement"
            placeholder="Displacement"
            dropdownClassName="z-[100]"
            inputMode="decimal"
            disabled={!effectiveIsEditing}
            pinnedIds={currentStrategy?.saved_favourites?.displacement}
            onTogglePin={currentStrategy ? handleToggleFavourite('displacement') : undefined}
          />
        </div>
      );
    }

    if (field === 'fvg_size') {
      const num = value != null && !isNaN(Number(value)) ? Number(value) : null;
      return (
        <div>
          <label className={`${labelClass} mb-2`}>{label}</label>
          <Input
            type="number"
            step="0.5"
            min={0.5}
            value={num !== null ? String(num) : ''}
            onChange={e => {
              const val = e.target.value;
              if (val === '') {
                handleInputChange(field, undefined);
                return;
              }
              const parsed = parseFloat(val);
              if (!Number.isNaN(parsed)) {
                const snapped = snapToHalfStep(parsed);
                const clamped = snapped < 0.5 ? 0.5 : snapped;
                handleInputChange(field, clamped);
              }
            }}
            onBlur={e => {
              const val = e.target.value;
              if (val === '') return;
              const parsed = parseFloat(val);
              if (!Number.isNaN(parsed)) {
                const snapped = snapToHalfStep(parsed);
                const clamped = snapped < 0.5 ? 0.5 : snapped;
                handleInputChange(field, clamped);
              }
            }}
            className={`${inputClass} placeholder:text-slate-400 dark:placeholder:text-slate-600`}
            disabled={!effectiveIsEditing}
            readOnly={!effectiveIsEditing}
          />
        </div>
      );
    }

    if (field === 'sl_size') {
      const num = value != null && !isNaN(Number(value)) ? Number(value) : null;
      return (
        <div>
          <label className={`${labelClass} mb-2`}>
            {label}
            {slUnitLabel && (
              <span className="ml-1 text-[11px] font-normal text-slate-400 dark:text-slate-500 normal-case tracking-normal">
                ({slUnitLabel})
              </span>
            )}
          </label>
          <CommonCombobox
            value={num !== null ? String(num) : ''}
            onChange={(v) => {
              const trimmed = v.trim();
              if (trimmed === '') {
                handleInputChange(field, '');
                return;
              }
              const n = parseFloat(trimmed);
              handleInputChange(field, Number.isFinite(n) ? n : '');
            }}
            options={slSizeOptions}
            defaultSuggestions={slSizeOptions}
            customValueLabel="SL size"
            placeholder={slUnitLabel ? `e.g. 10 ${slUnitLabel}` : 'e.g. 10'}
            dropdownClassName="z-[100]"
            inputMode="decimal"
            disabled={!effectiveIsEditing}
            pinnedIds={currentStrategy?.saved_favourites?.sl_size}
            onTogglePin={currentStrategy ? handleToggleFavourite('sl_size') : undefined}
          />
        </div>
      );
    }

    if (field === 'risk_reward_ratio') {
      const num = value != null && !isNaN(Number(value)) ? Number(value) : null;
      return (
        <div>
          <label className={`${labelClass} mb-2`}>{label}</label>
          <CommonCombobox
            value={num !== null ? String(num) : ''}
            onChange={(v) => {
              const trimmed = v.trim();
              if (trimmed === '') {
                handleInputChange(field, '');
                return;
              }
              const n = parseFloat(trimmed);
              handleInputChange(field, Number.isFinite(n) ? n : '');
            }}
            options={rrRatioOptions}
            defaultSuggestions={rrRatioOptions}
            customValueLabel="R:R"
            placeholder="e.g. 2"
            dropdownClassName="z-[100]"
            inputMode="decimal"
            disabled={!effectiveIsEditing}
            pinnedIds={currentStrategy?.saved_favourites?.rr_ratio}
            onTogglePin={currentStrategy ? handleToggleFavourite('rr_ratio') : undefined}
          />
        </div>
      );
    }

    switch (type) {
      case 'market':
        return (
          <div>
            <label className={`${labelClass} mb-2`}>{label}</label>
            <MarketCombobox
              value={value != null ? String(value) : ''}
              onChange={(v) => handleInputChange(field, v)}
              onBlur={() => {
                if (editedTrade.market) {
                  const normalized = normalizeMarket(editedTrade.market);
                  if (normalized !== editedTrade.market) handleInputChange(field, normalized);
                }
              }}
              placeholder="Search or type market (e.g. EURUSD, EUR/USD)"
              className={`${inputClass} placeholder:text-slate-400 dark:placeholder:text-slate-600`}
              dropdownClassName="z-[100]"
              defaultSuggestions={settings.saved_markets}
              pinnedIds={currentStrategy?.saved_favourites?.market}
              onTogglePin={currentStrategy ? handleToggleFavourite('market') : undefined}
            />
          </div>
        );
      case 'number': {
        const isIntegerField = field === 'num_contracts';
        const numVal = value != null && !isNaN(Number(value)) ? Number(value) : null;
        const displayedNum = numVal !== null && isIntegerField ? Math.trunc(numVal) : numVal;
        return (
          <div>
            <label className={`${labelClass} mb-2`}>{label}</label>
            <Input
              type="number"
              step={isIntegerField ? '1' : 'any'}
              min={isIntegerField ? 1 : undefined}
              inputMode={isIntegerField ? 'numeric' : 'decimal'}
              value={displayedNum !== null ? String(displayedNum) : ''}
              onChange={e => {
                const val = e.target.value;
                if (val === '') {
                  handleInputChange(field, '');
                  return;
                }
                const parsed = isIntegerField ? parseInt(val, 10) : parseFloat(val);
                handleInputChange(field, Number.isFinite(parsed) ? parsed : '');
              }}
              className={`${inputClass} placeholder:text-slate-400 dark:placeholder:text-slate-600`}
            />
          </div>
        );
      }
      case 'select':
        if (field === 'setup_type') {
          return (
            <div>
              <label className={`${labelClass} mb-2`}>{label}</label>
              <CommonCombobox
                id="setup-type-details"
                value={value != null ? String(value) : ''}
                onChange={(v) => handleInputChange('setup_type', v)}
                options={setupOptions}
                placeholder="Select or type setup"
                dropdownClassName="z-[100]"
                pinnedIds={currentStrategy?.saved_favourites?.setup}
                onTogglePin={currentStrategy ? handleToggleFavourite('setup') : undefined}
              />
            </div>
          );
        }
        if (field === 'liquidity') {
          return (
            <div>
              <label className={`${labelClass} mb-2`}>{label}</label>
              <CommonCombobox
                id="liquidity-details"
                value={value != null ? String(value) : ''}
                onChange={(v) => handleInputChange('liquidity', v)}
                options={liquidityOptions}
                defaultSuggestions={['HOD', 'LOD']}
                customValueLabel="conditions / liquidity"
                placeholder="Select or type conditions / liquidity"
                dropdownClassName="z-[100]"
                pinnedIds={currentStrategy?.saved_favourites?.liquidity}
                onTogglePin={currentStrategy ? handleToggleFavourite('liquidity') : undefined}
              />
            </div>
          );
        }
        return (
          <div>
            <label className={`${labelClass} mb-2`}>{label}</label>
            <Select
              value={value != null ? String(value) : ''}
              onValueChange={(val) => handleInputChange(field, val)}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                {options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'boolean':
        return (
          <div>
            <label className={`${labelClass} mb-2`}>{label}</label>
            <Select
              value={value ? 'true' : 'false'}
              onValueChange={(val) => handleInputChange(field, val === 'true')}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'outcome':
        return (
          <div>
            <label className={`${labelClass} mb-2`}>{label}</label>
            <Select
              value={value != null ? String(value) : ''}
              onValueChange={(val) => handleInputChange(field, val)}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                <SelectItem value="Win">Win</SelectItem>
                <SelectItem value="Lose">Lose</SelectItem>
                <SelectItem value="BE">BE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return (
          <div>
            <label className={`${labelClass} mb-2`}>{label}</label>
            <Input
              type="text"
              value={value != null ? String(value) : ''}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className={`${inputClass} placeholder:text-slate-400 dark:placeholder:text-slate-600`}
            />
          </div>
        );
    }
  };

  if (!trade) return null;

  return (
    <>
      {/* Fixed Header */}
      <div className={`relative px-6 pt-5 pb-4${pageMode ? ' text-center' : ' border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0'}`}>
        <div className="space-y-1.5">
          <div className={`flex items-center gap-4${pageMode ? ' justify-center' : ' justify-between'}`}>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Trade Details
            </h2>
            <div className="flex items-center gap-3">
              {/* Strategy name in top-right (from prop when readOnly, else from strategies).
                  Hidden entirely in pageMode (public share) since the page has its own header. */}
              {!pageMode && strategyName ? (
                <div className="max-w-[200px]">
                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Strategy</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={strategyName}>
                      {strategyName}
                    </p>
                  </div>
                </div>
              ) : null}
              {/* Share button (owner-only, hidden on public share pages) */}
              {!readOnly && trade?.id && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsShareOpen(true)}
                  disabled={isShareOpen}
                  className="h-8 w-8 cursor-pointer rounded-full border-slate-200/80 bg-slate-50/80 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50 disabled:opacity-60 disabled:pointer-events-none flex-shrink-0"
                  aria-label="Share this trade"
                  title="Share this trade"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              {!pageMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 cursor-pointer flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {editedTrade?.market} {editedTrade?.direction} • {editedTrade?.trade_date} {editedTrade?.trade_time ? (getIntervalForTime(editedTrade.trade_time)?.label ?? editedTrade.trade_time) : ''}
          </p>
        </div>
      </div>

      {/* Scrollable content (inner scroll in sidebar mode; natural page scroll when pageMode) */}
      <div ref={panelContentRef} className={`relative px-6 py-5${pageMode ? '' : ' overflow-y-auto flex-1'}`}>
        <TooltipProvider>
        <div className="space-y-6">
          {/* Trade Outcome Card - Prominent Display */}
          <div className="rounded-xl bg-slate-100/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
            <div className={`grid grid-cols-1 gap-6 ${editedTrade?.trade_outcome === 'BE' ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Outcome</label>
                <div className="mt-2">
                  {!effectiveIsEditing ? (
                    editedTrade?.trade_outcome === 'BE'
                      ? renderOutcomeBadge(editedTrade.trade_outcome)
                      : renderOutcomeBadges(editedTrade?.trade_outcome as string, editedTrade?.be_final_result)
                  ) : (
                    <TradeOutcomeChips
                      value={editedTrade?.trade_outcome}
                      onChange={(outcome) => handleInputChange('trade_outcome', outcome)}
                    />
                  )}
                </div>
              </div>
              {editedTrade?.trade_outcome === 'BE' && (
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">After BE</label>
                  <div className="mt-2">
                    {!effectiveIsEditing ? (
                      editedTrade?.be_final_result
                        ? renderOutcomeBadge(editedTrade.be_final_result)
                        : <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                    ) : (
                      <AfterBreakEvenSelect
                        value={editedTrade?.be_final_result}
                        onChange={(result) => handleInputChange('be_final_result', result)}
                        triggerClassName={selectTriggerClass}
                        contentClassName={selectContentClass}
                      />
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">P&L %</label>
                <div className={`mt-2 text-2xl font-bold ${editedTrade?.trade_outcome === 'Lose' ? 'text-red-500 dark:text-red-400' : editedTrade?.trade_outcome === 'BE' ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                  {typeof editedTrade?.pnl_percentage === 'number' ? editedTrade.pnl_percentage.toFixed(2) : '0.00'}%
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profit/Loss</label>
                <div className={`mt-2 text-2xl font-bold ${editedTrade?.trade_outcome === 'Lose' ? 'text-red-500 dark:text-red-400' : editedTrade?.trade_outcome === 'BE' ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                  {(() => {
                    const profit = typeof editedTrade?.calculated_profit === 'number' ? editedTrade.calculated_profit : 0;
                    const sign = profit < 0 ? '-' : '';
                    return `${sign}${currencySymbol}${Math.abs(profit).toFixed(2)}`;
                  })()}
                </div>
              </div>
              {hasCard('evaluation_stats') &&
                (effectiveIsEditing || (editedTrade?.evaluation != null && editedTrade.evaluation !== '')) && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Evaluation
                    </label>
                    <div className="mt-2">
                      {!effectiveIsEditing ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold themed-badge-live">
                          {editedTrade?.evaluation}
                        </span>
                      ) : (
                        <Select
                          value={editedTrade?.evaluation ?? ''}
                          onValueChange={(val) => handleInputChange('evaluation', val)}
                        >
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={selectContentClass}>
                            {EVALUATION_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Trade Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="rounded-xl bg-slate-100/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--tc-primary)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  {renderField('Date', 'trade_date')}
                  {renderField('Time', 'trade_time')}
                  {hasCard('trend_stats') &&
                    (effectiveIsEditing || (editedTrade?.trend != null && editedTrade.trend !== '')) &&
                    renderField('Trend', 'trend', 'select', TREND_OPTIONS)}
                </div>
                <div className="space-y-3">
                  {(effectiveIsEditing || (editedTrade?.day_of_week != null && editedTrade.day_of_week !== '')) && renderField('Day', 'day_of_week', 'select', DAY_OF_WEEK_OPTIONS)}
                  {renderField('Market', 'market', 'market')}
                </div>
                <div className="space-y-3">
                  {renderField('Direction', 'direction')}
                  {hasCard('setup_stats') && (effectiveIsEditing || (editedTrade?.setup_type != null && editedTrade.setup_type !== '')) && renderField('Pattern / Setup', 'setup_type', 'select', setupOptions)}
                </div>
              </div>
            </div>

            {/* Risk Management */}
            <div className="rounded-xl bg-slate-100/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--tc-primary)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Trade Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  {accountType === 'futures'
                    ? renderField('Contracts', 'num_contracts', 'number')
                    : renderField('Risk %', 'risk_per_trade', 'number')}
                  {renderField('RR', 'risk_reward_ratio', 'number')}
                  {accountType === 'futures' &&
                    editedTrade?.spec_source === 'override' &&
                    renderField('$ / SL-unit', 'dollar_per_sl_unit_override', 'number')}
                </div>
                <div className="space-y-3">
                  {hasCard('potential_rr') &&
                    (effectiveIsEditing ||
                      (editedTrade?.risk_reward_ratio_long != null &&
                        editedTrade.risk_reward_ratio_long !== undefined)) &&
                    renderField('Potential RR', 'risk_reward_ratio_long', 'number')}
                  {(hasCard('sl_size_stats') || accountType === 'futures') &&
                    (effectiveIsEditing ||
                      (editedTrade?.sl_size != null && editedTrade.sl_size !== undefined)) &&
                    renderField(
                      accountType === 'futures' ? 'SL (size)' : 'SL Size',
                      'sl_size',
                      'number',
                    )}
                </div>
                {(hasCard('displacement_size') || hasCard('avg_displacement') || hasCard('fvg_size') || hasCard('liquidity_stats')) && (
                  <div className="space-y-3">
                    {(hasCard('displacement_size') || hasCard('avg_displacement')) && renderField('Displacement', 'displacement_size', 'number')}
                    {hasCard('fvg_size') && (effectiveIsEditing || (editedTrade?.fvg_size != null && editedTrade.fvg_size !== undefined)) && renderField('FVG Size', 'fvg_size', 'number')}
                    {hasCard('liquidity_stats') && (effectiveIsEditing || (editedTrade?.liquidity != null && editedTrade.liquidity !== '')) && renderField('Conditions / Liq.', 'liquidity', 'select', liquidityOptions)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trade Conditions */}
          <div className="rounded-xl bg-slate-100/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--tc-primary)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Trade Conditions
            </h3>

            {!effectiveIsEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Execution */}
                <div>
                  <h4 className="themed-heading-accent text-xs font-semibold uppercase tracking-wider mb-3">Execution</h4>
                  <div className="flex flex-wrap gap-2">
                    {hasCard('mss_stats') && editedTrade?.mss && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium bg-transparent text-slate-500 dark:text-slate-500 border-slate-300 dark:border-slate-700">
                        MSS: {editedTrade.mss}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${editedTrade?.reentry ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-transparent' : 'bg-transparent text-slate-500 dark:text-slate-500 border-slate-300 dark:border-slate-700'}`}>
                      {editedTrade?.reentry && <Check className="w-3 h-3" />}
                      Re-entry
                    </span>
                    {hasCard('launch_hour') && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${editedTrade?.launch_hour ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-transparent' : 'bg-transparent text-slate-500 dark:text-slate-500 border-slate-300 dark:border-slate-700'}`}>
                        {editedTrade?.launch_hour && <Check className="w-3 h-3" />}
                        Lunch Hour
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${editedTrade?.executed ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-transparent' : 'bg-transparent text-slate-500 dark:text-slate-500 border-slate-300 dark:border-slate-700'}`}>
                      {editedTrade?.executed && <Check className="w-3 h-3" />}
                      Executed
                    </span>
                  </div>
                </div>

                {/* Context */}
                <div>
                  <h4 className="themed-heading-accent text-xs font-semibold uppercase tracking-wider mb-3">Context</h4>
                  <div className="flex flex-wrap gap-2">
                    {hasCard('session_stats') && (editedTrade?.session ?? '').trim() !== '' && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${SESSION_PALETTE[editedTrade!.session]?.chipClass ?? 'bg-transparent text-slate-500 dark:text-slate-500 border-slate-200 dark:border-slate-700'}`}>
                        Session: {editedTrade?.session}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${editedTrade?.news_related ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-transparent' : 'bg-transparent text-slate-500 dark:text-slate-500 border-slate-200 dark:border-slate-700'}`}>
                      {editedTrade?.news_related && <Check className="w-3 h-3" />}
                      News Related
                    </span>
                    {editedTrade?.news_related && editedTrade.news_name && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-transparent">
                        {editedTrade.news_name}
                        {editedTrade.news_intensity != null && (
                          <span className="flex items-center gap-0.5 ml-0.5">
                            {[1, 2, 3].map((s) => (
                              <span key={s} className={`text-sm leading-none ${s <= editedTrade.news_intensity! ? 'text-amber-600 dark:text-amber-400' : 'text-amber-300 dark:text-amber-700'}`}>★</span>
                            ))}
                          </span>
                        )}
                      </span>
                    )}
                    {hasCard('local_hl_stats') && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${editedTrade?.local_high_low ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-transparent' : 'bg-transparent text-slate-500 dark:text-slate-500 border-slate-300 dark:border-slate-700'}`}>
                        {editedTrade?.local_high_low && <Check className="w-3 h-3" />}
                        Local High/Low
                      </span>
                    )}
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <h4 className="themed-heading-accent text-xs font-semibold uppercase tracking-wider mb-3">Performance</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${editedTrade?.partials_taken ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-transparent' : 'bg-transparent text-slate-500 dark:text-slate-500 border-slate-300 dark:border-slate-700'}`}>
                      {editedTrade?.partials_taken && <Check className="w-3 h-3" />}
                      Partials
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Execution */}
                <div>
                  <h4 className="themed-heading-accent text-xs font-semibold uppercase tracking-wider mb-3">Execution</h4>
                  <div className="space-y-3">
                    {hasCard('mss_stats') && renderField('MSS', 'mss', 'select', MSS_OPTIONS)}
                    {renderField('Re-entry', 'reentry', 'boolean')}
                    {hasCard('launch_hour') && renderField('Lunch Hour', 'launch_hour', 'boolean')}
                    {renderField('Executed', 'executed', 'boolean')}
                  </div>
                </div>

                {/* Context */}
                <div>
                  <h4 className="themed-heading-accent text-xs font-semibold uppercase tracking-wider mb-3">Context</h4>
                  <div className="space-y-3">
                    {hasCard('session_stats') && renderField('Session', 'session', 'select', Array.from(SESSION_OPTIONS))}
                    {renderField('News Related', 'news_related', 'boolean')}
                    {editedTrade?.news_related && (
                      <div className="space-y-2">
                        <label className={`${labelClass} mb-1`}>News Event</label>
                        <NewsCombobox
                          id="news-name"
                          value={editedTrade.news_name ?? ''}
                          onChange={(v) => handleInputChange('news_name', v || null)}
                          onSelect={(item) => {
                            handleInputChange('news_name', item.name);
                            handleInputChange('news_intensity', item.intensity);
                          }}
                          savedNews={settings.saved_news as SavedNewsItem[]}
                          placeholder="e.g. CPI, NFP, FOMC"
                          className={`${inputClass} placeholder:text-slate-400 dark:placeholder:text-slate-600`}
                          pinnedIds={currentStrategy?.saved_favourites?.news}
                          onTogglePin={currentStrategy ? handleToggleFavourite('news') : undefined}
                        />
                        <div className="flex items-center gap-1" role="group" aria-label="News intensity">
                          {[1, 2, 3].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() =>
                                handleInputChange('news_intensity', editedTrade.news_intensity === star ? null : star)
                              }
                              className={`text-xl leading-none transition-colors cursor-pointer focus:outline-none ${
                                editedTrade.news_intensity != null && star <= editedTrade.news_intensity
                                  ? 'text-amber-400'
                                  : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
                              }`}
                              title={NEWS_INTENSITY_LABELS[star] ?? 'Unknown'}
                              aria-label={`News intensity ${NEWS_INTENSITY_LABELS[star] ?? star}`}
                              aria-pressed={editedTrade.news_intensity != null && star <= editedTrade.news_intensity}
                            >
                              ★
                            </button>
                          ))}
                          {editedTrade.news_intensity != null && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                              {NEWS_INTENSITY_LABELS[editedTrade.news_intensity] ?? 'Unknown'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {hasCard('local_hl_stats') &&
                      renderField('Local High/Low', 'local_high_low', 'boolean')}
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <h4 className="themed-heading-accent text-xs font-semibold uppercase tracking-wider mb-3">Performance</h4>
                  <div className="space-y-3">
                    {renderField('Partials', 'partials_taken', 'boolean')}
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {(effectiveIsEditing || (editedTrade?.tags ?? []).length > 0) && (
              <div className="mt-5 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 space-y-3">
                <Label className="block text-xs font-semibold uppercase tracking-wider themed-heading-accent">Tags</Label>
                {effectiveIsEditing ? (
                  <TagInput
                    tags={editedTrade?.tags ?? []}
                    savedTags={[...((readOnly ? savedTagsProp : (currentStrategy?.saved_tags ?? savedTagsProp)) ?? [])].sort((a, b) => a.name.localeCompare(b.name))}
                    onChange={(tags) => handleInputChange('tags', tags)}
                    onUpdateColor={!readOnly && currentStrategy && userId ? async (tagName: string, color: TagColor) => {
                      await updateTagColor(currentStrategy.id, userId, tagName, color);
                    } : undefined}
                    pinnedTags={currentStrategy?.saved_favourites?.tags}
                    onTogglePin={!readOnly && currentStrategy ? handleToggleFavourite('tags') : undefined}
                    placeholder="Add tag..."
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(editedTrade?.tags ?? []).map((tag) => {
                      const vocab = (readOnly ? savedTagsProp : (currentStrategy?.saved_tags ?? savedTagsProp)) ?? [];
                      const tagStyle = resolveTagColorStyle(vocab.find(t => t.name === tag)?.color);
                      return (
                        <span
                          key={tag}
                          title={tag}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm max-w-[140px] text-white shadow-sm"
                          style={{ background: tagStyle.gradient }}
                        >
                          <span className="truncate">{tag.length > 20 ? tag.slice(0, 19) + '…' : tag}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Trade Screenshots */}
          {(effectiveIsEditing || editedTrade?.trade_screens?.some((s) => s)) && (
          <div className="rounded-xl bg-slate-100/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--tc-primary)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Trade Screenshots
            </h3>

            {!effectiveIsEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[320px]">
                {(editedTrade?.trade_screens ?? []).map((url, i) =>
                  url && isSafeUrl(url) ? (
                    <div key={`screen-${i}`} className="flex flex-col min-h-0">
                      <div className="flex items-center justify-between mb-2 block shrink-0">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Trade Screen {i + 1}
                        </label>
                        {(editedTrade?.trade_screen_timeframes?.[i] ?? '').trim() !== '' && (
                          <span className="inline-flex items-center rounded-md border border-slate-300/70 dark:border-slate-700/70 bg-slate-200/50 dark:bg-slate-800/60 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-700 dark:text-slate-200">
                            {editedTrade?.trade_screen_timeframes?.[i]}
                          </span>
                        )}
                      </div>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col group flex-1 min-h-0">
                        <div className="relative overflow-hidden rounded-lg border-2 border-slate-200 dark:border-slate-700 themed-hover-border transition-all duration-300 flex-1 min-h-64">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Trade Screen ${i + 1}`}
                            width={640}
                            height={360}
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </div>
                      </a>
                    </div>
                  ) : null
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[0, 1].map((i) => {
                    return (
                      <TradeScreenSlotEditor
                        key={`screen-${i}`}
                        index={i}
                        label={`Trade Screen ${i + 1}`}
                        timeframe={editedTrade?.trade_screen_timeframes?.[i] ?? ''}
                        screenUrl={editedTrade?.trade_screens?.[i] ?? ''}
                        onTimeframeChange={(nextTf) => {
                          const next = [...(editedTrade?.trade_screen_timeframes ?? ['', '', '', ''])];
                          next[i] = nextTf;
                          handleInputChange('trade_screen_timeframes', next);
                        }}
                        onScreenUrlChange={(nextUrl) => {
                          const next = [...(editedTrade?.trade_screens ?? ['', '', '', ''])];
                          next[i] = nextUrl;
                          handleInputChange('trade_screens', next);
                        }}
                        labelClassName={labelClass}
                        labelRowClassName="mb-2 flex flex-wrap items-center justify-between gap-2"
                        chipActiveClassName="themed-rating-active border-transparent"
                        customInputClassName={`${inputClass} h-9`}
                        customInputRef={(el) => {
                          customTfInputRefs.current[i] = el;
                        }}
                        urlInputClassName={`${inputClass} flex-1 placeholder:text-slate-400 dark:placeholder:text-slate-600`}
                        showOpenLink
                      />
                    );
                  })}
                </div>

                {showExtraScreens && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[2, 3].map((i) => {
                      return (
                        <TradeScreenSlotEditor
                          key={`screen-${i}`}
                          index={i}
                          label={`Trade Screen ${i + 1}`}
                          timeframe={editedTrade?.trade_screen_timeframes?.[i] ?? ''}
                          screenUrl={editedTrade?.trade_screens?.[i] ?? ''}
                          onTimeframeChange={(nextTf) => {
                            const next = [...(editedTrade?.trade_screen_timeframes ?? ['', '', '', ''])];
                            next[i] = nextTf;
                            handleInputChange('trade_screen_timeframes', next);
                          }}
                          onScreenUrlChange={(nextUrl) => {
                            const next = [...(editedTrade?.trade_screens ?? ['', '', '', ''])];
                            next[i] = nextUrl;
                            handleInputChange('trade_screens', next);
                          }}
                          labelClassName={labelClass}
                          labelRowClassName="mb-2 flex flex-wrap items-center justify-between gap-2"
                          chipActiveClassName="themed-rating-active border-transparent"
                          customInputClassName={`${inputClass} h-9`}
                          customInputRef={(el) => {
                            customTfInputRefs.current[i] = el;
                          }}
                          urlInputClassName={`${inputClass} flex-1 placeholder:text-slate-400 dark:placeholder:text-slate-600`}
                          showOpenLink
                        />
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="tdp-need-more-screens"
                    checked={showExtraScreens}
                    onCheckedChange={(checked) => setShowExtraScreens(!!checked)}
                    className="themed-checkbox h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-150 data-[state=checked]:!text-white"
                  />
                  <label
                    htmlFor="tdp-need-more-screens"
                    className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300 select-none"
                  >
                    Need more?
                  </label>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Notes & Confidence Section */}
          <div className="space-y-3">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Notes & Confidence</Label>
            <Textarea
              value={editedTrade?.notes ?? ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              disabled={!effectiveIsEditing}
              readOnly={!effectiveIsEditing}
              className="min-h-[320px] bg-slate-100/50 dark:bg-slate-800/30 shadow-none backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 disabled:!opacity-100 themed-focus transition-all duration-300 placeholder:text-slate-500 dark:placeholder:text-slate-600 text-slate-900 dark:text-slate-100 disabled:cursor-not-allowed read-only:cursor-default"
              placeholder="Add your trade notes here..."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-100/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
              {/* Confidence */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Confidence</p>
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
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={!effectiveIsEditing}
                      onClick={() => handleInputChange('confidence_at_entry', value)}
                      className={`min-w-[2.25rem] px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden ${
                        editedTrade?.confidence_at_entry === value
                          ? 'themed-rating-active'
                          : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title={CONFIDENCE_LABELS[value] ?? 'Unknown'}
                      aria-label={`Confidence ${CONFIDENCE_LABELS[value] ?? value} of 5`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                {editedTrade?.confidence_at_entry != null && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selected: {CONFIDENCE_LABELS[editedTrade.confidence_at_entry] ?? 'Unknown'}
                  </p>
                )}
              </div>
              {/* Mind state */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Mind state</p>
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
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={!effectiveIsEditing}
                      onClick={() => handleInputChange('mind_state_at_entry', value)}
                      className={`min-w-[2.25rem] px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden ${
                        editedTrade?.mind_state_at_entry === value
                          ? 'themed-rating-active'
                          : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title={MIND_STATE_LABELS[value] ?? 'Unknown'}
                      aria-label={`Mind state ${MIND_STATE_LABELS[value] ?? value} of 5`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                {editedTrade?.mind_state_at_entry != null && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selected: {MIND_STATE_LABELS[editedTrade.mind_state_at_entry] ?? 'Unknown'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Delete confirm AlertDialog (hidden in read-only mode) */}
          {!readOnly && (
          <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => { setShowDeleteConfirm(open); if (!open) setError(null); }}>
            <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient !rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  <span className="text-red-500 dark:text-red-400 font-semibold text-lg">Confirm Delete</span>
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="text-slate-600 dark:text-slate-400">Are you sure you want to delete this trade? This action cannot be undone.</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex gap-3">
                <AlertDialogCancel asChild>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 flex items-center gap-2"
                  >
                    Yes, Delete
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 backdrop-blur-sm p-3 border border-red-500/20">
              <p className="text-sm text-red-500 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          {/* Action Buttons (hidden in read-only mode) */}
          {!readOnly && (
          <div className="flex justify-end gap-3 pt-2">
            {!effectiveIsEditing ? (
              <>
                <Button
                  onClick={() => {
                    setIsEditing(true);
                    // Focus first editable field after React re-renders with edit mode
                    requestAnimationFrame(() => {
                      const firstInput = panelContentRef.current?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                        'input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([readonly]):not([disabled])'
                      );
                      firstInput?.focus();
                    });
                  }}
                  className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-5 py-2 group border-0 disabled:opacity-60 flex items-center gap-2"
                >
                  <span className="relative z-10">Edit Trade</span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="destructive"
                  disabled={isDeleting}
                  className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60 flex items-center gap-2"
                >
                  {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isDeleting ? 'Deleting...' : 'Delete Trade'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedTrade(trade);
                  }}
                  className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-5 py-2 group border-0 disabled:opacity-60"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSaving ? 'Saving changes' : 'Save Changes'}
                  </span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                </Button>
              </>
            )}
          </div>
          )}
        </div>
        </TooltipProvider>
      </div>
      {!readOnly && trade && (
        <ShareTradeModal
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          trade={trade}
        />
      )}
    </>
  );
}
