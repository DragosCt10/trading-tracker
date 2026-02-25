'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Trade } from '@/types/trade';
import { deleteTrade, updateTrade } from '@/lib/server/trades';
import { useQueryClient } from '@tanstack/react-query';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useStrategies } from '@/hooks/useStrategies';
import { AlertCircle, Loader2 } from 'lucide-react';

// Shared input/select styles to match NewTradeModal (themed, rounded-2xl)
const inputClass = 'h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300';
const selectTriggerClass = 'h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300';
const selectContentClass = 'z-[100] border border-slate-200/70 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50';
const labelClass = 'block text-sm font-semibold text-slate-700 dark:text-slate-300';

// shadcn UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { getMarketValidationError, normalizeMarket } from '@/utils/validateMarket';
import { calculateTradePnl } from '@/utils/helpers/tradePnlCalculator';
import { MarketCombobox } from '@/components/MarketCombobox';

interface TradeDetailsModalProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onTradeUpdated?: () => void;
}

export default function TradeDetailsModal({ trade, isOpen, onClose, onTradeUpdated }: TradeDetailsModalProps) {
  const params = useParams();
  const strategySlug = (params?.strategy as string | undefined) ?? '';
  const isTradingInstitutional = strategySlug === 'trading-institutional';
  const { selection } = useActionBarSelection();
  const { data: userData } = useUserDetails();
  const userId = userData?.user?.id;
  const { strategies } = useStrategies({ userId });
  const [isEditing, setIsEditing] = useState(false);
  const [editedTrade, setEditedTrade] = useState<Trade | null>(trade);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressDialog, setProgressDialog] = useState<{
    open: boolean;
    status: 'loading' | 'success' | 'error';
    message: string;
    title: 'Update' | 'Delete';
  }>({ open: false, status: 'loading', message: '', title: 'Update' });
  const queryClient = useQueryClient();

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // Helper: invalidate and refetch ALL queries (same as NewTradeModal – ensures list, analytics, discover all update)
  // When strategy_id changes, remove and invalidate queries for all strategies so navigation to other strategy pages gets fresh data
  const invalidateAndRefetchTradeQueries = async () => {
    // Set a flag in sessionStorage to prevent stale initialData hydration on next navigation
    // This ensures that when navigating to a strategy page, it will fetch fresh data instead of using stale initialData
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('trade-data-invalidated', Date.now().toString());
    }
    
    // Remove all trade-related queries entirely (forces fresh fetch when navigating)
    // This ensures that when navigating to any strategy page, queries will be refetched from server
    // Remove by exact query key patterns to catch all variations (different strategyIds, modes, etc.)
    queryClient.removeQueries({ predicate: (query) => {
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
    // Also invalidate all queries to catch any other trade-related data
    await queryClient.invalidateQueries();
    // Refetch only active queries (current page) - other pages will refetch when navigated to
    await queryClient.refetchQueries({ type: 'active' });
  };

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
  const LIQUIDITY_OPTIONS = ['Major Liquidity', 'Low Liquidity', 'Local Liquidity', 'HOD', 'LOD'];
  const MSS_OPTIONS = ['Normal', 'Aggressive'];
  const EVALUATION_OPTIONS = ['A+', 'A', 'B', 'C'];
  const DAY_OF_WEEK_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const TREND_OPTIONS = ['Trend-following', 'Counter-trend'];

  const snapToHalfStep = (num: number) => Math.round(num * 2) / 2;

  // Potential Risk:Reward Ratio (RR Long) – same options as NewTradeModal: 1 to 10 step 0.5, plus 10+
  const POTENTIAL_RR_OPTIONS: { value: number; label: string }[] = [
    ...Array.from({ length: 19 }, (_, i) => {
      const v = 1 + i * 0.5;
      return { value: v, label: String(v) };
    }),
    { value: 10.5, label: '10+' },
  ];
  const formatPotentialRR = (val: number | undefined | null): string => {
    if (val == null || Number.isNaN(Number(val))) return '—';
    const n = Number(val);
    return n === 10.5 ? '10+' : String(n);
  };

  if (!isOpen || !trade) return null;

  // Update editedTrade when trade changes
  if (trade !== editedTrade && !isEditing) {
    setEditedTrade(trade);
  }

  const handleInputChange = (field: keyof Trade, value: any) => {
    if (!editedTrade) return;

    // Calculate new P&L percentage and calculated_profit when risk, RR, or outcome changes
    if (field === 'risk_per_trade' || field === 'risk_reward_ratio' || field === 'trade_outcome') {
      const newRisk = field === 'risk_per_trade' ? value : editedTrade.risk_per_trade;
      const newRR = field === 'risk_reward_ratio' ? value : editedTrade.risk_reward_ratio;
      const newOutcome = field === 'trade_outcome' ? value : editedTrade.trade_outcome;

      const { pnl_percentage, calculated_profit } = calculateTradePnl(
        {
          trade_outcome: newOutcome,
          risk_per_trade: Number(newRisk),
          risk_reward_ratio: Number(newRR),
          break_even: editedTrade.break_even,
        },
        selection.activeAccount?.account_balance || 0
      );

      // When outcome becomes Lose, set Potential R:R to 0 (read-only)
      const nextState = {
        ...editedTrade,
        [field]: value,
        calculated_profit,
        pnl_percentage,
      };
      if (field === 'trade_outcome' && value === 'Lose') {
        nextState.risk_reward_ratio_long = 0;
      }
      setEditedTrade(nextState);
    } else {
      setEditedTrade({
        ...editedTrade,
        [field]: value
      });
    }
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
    setProgressDialog({ open: true, status: 'loading', message: 'Please wait while we save your trade data...', title: 'Update' });

    try {
      const tradingMode = (editedTrade.mode || selection.mode) as 'live' | 'backtesting' | 'demo';
      const updateData = {
        trade_date: editedTrade.trade_date,
        trade_time: editedTrade.trade_time,
        day_of_week: editedTrade.day_of_week || '',
        quarter: editedTrade.quarter || '',
        market: normalizeMarket(editedTrade.market),
        direction: editedTrade.direction,
        setup_type: editedTrade.setup_type,
        liquidity: editedTrade.liquidity,
        sl_size: editedTrade.sl_size,
        displacement_size: editedTrade.displacement_size,
        risk_per_trade: editedTrade.risk_per_trade,
        trade_outcome: editedTrade.trade_outcome,
        risk_reward_ratio: editedTrade.risk_reward_ratio,
        risk_reward_ratio_long: editedTrade.trade_outcome === 'Lose' ? 0 : editedTrade.risk_reward_ratio_long,
        trade_link: editedTrade.trade_link,
        liquidity_taken: editedTrade.liquidity_taken,
        mss: editedTrade.mss,
        break_even: editedTrade.break_even,
        reentry: editedTrade.reentry,
        news_related: editedTrade.news_related,
        local_high_low: editedTrade.local_high_low,
        notes: editedTrade.notes,
        pnl_percentage: editedTrade.pnl_percentage,
        calculated_profit: editedTrade.calculated_profit,
        evaluation: editedTrade.evaluation,
        partials_taken: editedTrade.partials_taken,
        executed: editedTrade.executed,
        launch_hour: editedTrade.launch_hour,
        strategy_id: editedTrade.strategy_id,
        trend: editedTrade.trend ?? null,
        fvg_size: editedTrade.fvg_size ?? null,
      };

      const { error: updateError } = await updateTrade(editedTrade.id, tradingMode, updateData);

      if (updateError) {
        setProgressDialog({ open: true, status: 'error', message: updateError.message ?? 'Failed to update trade. Please try again.', title: 'Update' });
        setIsSaving(false);
        return;
      }

      setProgressDialog({ open: true, status: 'loading', message: 'Updating analytics and refreshing charts...', title: 'Update' });
      await invalidateAndRefetchTradeQueries();

      setProgressDialog({ open: true, status: 'success', message: 'Your trade has been updated successfully. All charts and statistics have been updated.', title: 'Update' });
      setIsEditing(false);
      if (onTradeUpdated) onTradeUpdated();

      setTimeout(() => {
        setProgressDialog({ open: false, status: 'loading', message: '', title: 'Update' });
        setIsSaving(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setProgressDialog({ open: true, status: 'error', message: err.message || 'Failed to save trade. Please try again.', title: 'Update' });
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!trade || !trade.id) return;
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    setError(null);
    setProgressDialog({ open: true, status: 'loading', message: 'Deleting trade...', title: 'Delete' });

    try {
      const tradingMode = (trade.mode || selection.mode) as 'live' | 'backtesting' | 'demo';
      const { error: deleteError } = await deleteTrade(trade.id, tradingMode);

      if (deleteError) {
        setProgressDialog({ open: true, status: 'error', message: deleteError.message ?? 'Failed to delete trade. Please try again.', title: 'Delete' });
        setIsDeleting(false);
        return;
      }

      setProgressDialog({ open: true, status: 'loading', message: 'Updating analytics and refreshing charts...', title: 'Delete' });
      await invalidateAndRefetchTradeQueries();

      setProgressDialog({ open: true, status: 'success', message: 'Your trade has been deleted successfully. All charts and statistics have been updated.', title: 'Delete' });
      if (onTradeUpdated) onTradeUpdated();

      setTimeout(() => {
        setProgressDialog({ open: false, status: 'loading', message: '', title: 'Update' });
        setIsDeleting(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setProgressDialog({ open: true, status: 'error', message: err.message ?? 'Failed to delete trade. Please try again.', title: 'Delete' });
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
      'Break Even': 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
    };
    return (
      <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-lg ${
        colors[outcome] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
      }`}>
        {outcome}
      </span>
    );
  };

  const renderField = (
    label: string,
    field: keyof Trade,
    type: 'text' | 'number' | 'select' | 'boolean' | 'outcome' | 'market' = 'text',
    options?: string[]
  ) => {
    if (!editedTrade) return null;
    const value = editedTrade[field];

    if (!isEditing) {
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
            <dd className="mt-1.5">{renderOutcomeBadge(outcome)}</dd>
          </div>
        );
      }
      if (type === 'number') {
        const displayValue = typeof value === 'number' ? value.toFixed(2) : value;
        if (field === 'risk_reward_ratio_long') {
          return (
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</dt>
              <dd className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatPotentialRR(value as number)}</dd>
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
      return (
        <div>
          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</dt>
          <dd className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{value as string}</dd>
        </div>
      );
    }

    // For P&L percentage, make it read-only
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

    // For Risk, make it editable only in editing mode (normalize so no leading zeros like "04")
    if (field === 'risk_per_trade') {
      const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
      const displayValue = numValue.toFixed(2);
      if (isEditing) {
        const num = value != null && !isNaN(Number(value)) ? Number(value) : null;
        return (
          <div>
            <label className={`${labelClass} mb-2`}>{label}</label>
            <Input
              type="number"
              step="any"
              min={0}
              value={num !== null ? String(num) : ''}
              onChange={e => {
                const val = e.target.value;
                handleInputChange(field, val === '' ? '' : parseFloat(val));
              }}
              className={`${inputClass} placeholder:text-slate-400 dark:placeholder:text-slate-600`}
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

    // Potential Risk:Reward Ratio (RR Long) – select 1, 1.5, … 10, 10+; read-only when outcome is Lose
    if (field === 'risk_reward_ratio_long') {
      if (editedTrade.trade_outcome === 'Lose') {
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
      const currentValue = editedTrade.risk_reward_ratio_long != null ? String(editedTrade.risk_reward_ratio_long) : '';
      return (
        <div>
          <label className={`${labelClass} mb-2`}>{label}</label>
          <Select
            value={currentValue}
            onValueChange={(v) => handleInputChange('risk_reward_ratio_long', v === '' ? undefined : Number(v))}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Potential RR (1 – 10 or 10+)" />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              {POTENTIAL_RR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // For Displacement Size, handle as number (normalize so no leading zeros)
    if (field === 'displacement_size') {
      const num = value != null && !isNaN(Number(value)) ? Number(value) : null;
      return (
        <div>
          <label className={`${labelClass} mb-2`}>{label}</label>
          <Input
            type="number"
            step="any"
            value={num !== null ? String(num) : ''}
            onChange={e => {
              const val = e.target.value;
              handleInputChange(field, val === '' ? '' : parseFloat(val));
            }}
            className={`${inputClass} placeholder:text-slate-400 dark:placeholder:text-slate-600`}
            disabled={!isEditing}
            readOnly={!isEditing}
          />
        </div>
      );
    }

    // FVG Size: 0.5 steps only, min 0.5
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
                handleInputChange(field, undefined as any);
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
            disabled={!isEditing}
            readOnly={!isEditing}
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
            />
          </div>
        );
      case 'number':
        const numVal = value != null && !isNaN(Number(value)) ? Number(value) : null;
        return (
          <div>
            <label className={`${labelClass} mb-2`}>{label}</label>
            <Input
              type="number"
              step="any"
              value={numVal !== null ? String(numVal) : ''}
              onChange={e => {
                const val = e.target.value;
                handleInputChange(field, val === '' ? '' : parseFloat(val));
              }}
              className={`${inputClass} placeholder:text-slate-400 dark:placeholder:text-slate-600`}
            />
          </div>
        );
      case 'select':
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

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-6xl max-h-[90vh] fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 rounded-2xl p-0 flex flex-col overflow-hidden">
        {/* Gradient orbs background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div
            className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '8s' }}
          />
          <div
            className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '10s', animationDelay: '2s' }}
          />
        </div>

        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Top accent line (theme-aware, same as NewTradeModal) */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        {/* Fixed Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <AlertDialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <AlertDialogTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Trade Details
              </AlertDialogTitle>
              <div className="flex items-center gap-3">
                {/* Strategy name (read-only in view and edit) */}
                <div className="max-w-[200px]">
                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Strategy</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={strategies.find((s) => s.id === editedTrade?.strategy_id)?.name ?? '—'}>
                      {strategies.find((s) => s.id === editedTrade?.strategy_id)?.name ?? '—'}
                    </p>
                  </div>
                </div>
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
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              {editedTrade?.market} {editedTrade?.direction} • {editedTrade?.trade_date} {editedTrade?.trade_time}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Scrollable content */}
        <div className="relative overflow-y-auto flex-1 px-6 py-5">
          <div className="space-y-6">
            {/* Trade Outcome Card - Prominent Display */}
            <div className="rounded-xl bg-slate-100/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Outcome</label>
                  <div className="mt-2">
                    {!isEditing ? (
                      renderOutcomeBadge(editedTrade?.trade_outcome as string)
                    ) : (
                      <Select
                        value={editedTrade?.trade_outcome ?? ''}
                        onValueChange={(val) => handleInputChange('trade_outcome', val)}
                      >
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={selectContentClass}>
                          <SelectItem value="Win">Win</SelectItem>
                          <SelectItem value="Lose">Lose</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">P&L %</label>
                  <div className={`mt-2 text-2xl font-bold ${editedTrade?.trade_outcome === 'Lose' ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                    {typeof editedTrade?.pnl_percentage === 'number' ? editedTrade.pnl_percentage.toFixed(2) : '0.00'}%
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profit/Loss</label>
                  <div className={`mt-2 text-2xl font-bold ${editedTrade?.trade_outcome === 'Lose' ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                    {typeof editedTrade?.calculated_profit === 'number' ? editedTrade.calculated_profit.toFixed(2) : '0.00'}
                  </div>
                </div>
                {(isEditing || (editedTrade?.evaluation != null && editedTrade.evaluation !== '')) && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Evaluation</label>
                    <div className="mt-2">
                      {!isEditing ? (
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
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
                    {(isEditing || (editedTrade?.trend != null && editedTrade.trend !== '')) && renderField('Trend', 'trend', 'select', TREND_OPTIONS)}
                  </div>
                  <div className="space-y-3">
                    {(isEditing || (editedTrade?.day_of_week != null && editedTrade.day_of_week !== '')) && renderField('Day', 'day_of_week', 'select', DAY_OF_WEEK_OPTIONS)}
                    {renderField('Market', 'market', 'market')}
                  </div>
                  <div className="space-y-3">
                    {renderField('Direction', 'direction', 'select', ['Long', 'Short'])}
                    {isTradingInstitutional && (isEditing || (editedTrade?.setup_type != null && editedTrade.setup_type !== '')) && renderField('Setup Type', 'setup_type', 'select', SETUP_OPTIONS)}
                  </div>
                </div>
              </div>

              {/* Risk Management */}
              <div className="rounded-xl bg-slate-100/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 p-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--tc-primary)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Risk Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    {renderField('Risk %', 'risk_per_trade', 'number')}
                    {renderField('Risk/Reward', 'risk_reward_ratio', 'number')}
                  </div>
                  <div className="space-y-3">
                    {renderField('RR (Long)', 'risk_reward_ratio_long', 'number')}
                    {renderField('SL Size', 'sl_size', 'number')}
                  </div>
                  {isTradingInstitutional && (
                    <div className="space-y-3">
                      {renderField('Displacement', 'displacement_size', 'number')}
                      {(isEditing || (editedTrade?.fvg_size != null && editedTrade.fvg_size !== undefined)) && renderField('FVG Size', 'fvg_size', 'number')}
                      {(isEditing || (editedTrade?.liquidity != null && editedTrade.liquidity !== '')) && renderField('Liquidity', 'liquidity', 'select', LIQUIDITY_OPTIONS)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trade Conditions - Single Card with 3 columns */}
            <div className="rounded-xl bg-slate-100/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
<svg className="w-4 h-4 shrink-0" style={{ color: 'var(--tc-primary)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Trade Conditions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Execution */}
                <div>
                  <h4 className="themed-heading-accent text-xs font-semibold uppercase tracking-wider mb-3">Execution</h4>
                  <div className="space-y-3">
                    {isTradingInstitutional && (isEditing || (editedTrade?.mss != null && editedTrade.mss !== '')) && renderField('MSS', 'mss', 'select', MSS_OPTIONS)}
                    {renderField('Break Even', 'break_even', 'boolean')}
                    {renderField('Re-entry', 'reentry', 'boolean')}
                  </div>
                </div>

                {/* Context */}
                <div>
                  <h4 className="themed-heading-accent text-xs font-semibold uppercase tracking-wider mb-3">Context</h4>
                  <div className="space-y-3">
                    {renderField('News Related', 'news_related', 'boolean')}
                    {renderField('Local High/Low', 'local_high_low', 'boolean')}
                    {isTradingInstitutional && renderField('Launch Hour', 'launch_hour', 'boolean')}
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <h4 className="themed-heading-accent text-xs font-semibold uppercase tracking-wider mb-3">Performance</h4>
                  <div className="space-y-3">
                    {renderField('Partials', 'partials_taken', 'boolean')}
                    {renderField('Executed', 'executed', 'boolean')}
                  </div>
                </div>
              </div>
            </div>

            {/* Trade Screenshots - only show when has link(s) or when editing */}
            {(isEditing || editedTrade?.trade_link || (isTradingInstitutional && editedTrade?.liquidity_taken)) && (
            <div className="rounded-xl bg-slate-100/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
<svg className="w-4 h-4 shrink-0" style={{ color: 'var(--tc-primary)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Trade Screenshots
              </h3>
              
              {!isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {editedTrade?.trade_link ? (
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Trade Chart</label>
                      <a href={editedTrade.trade_link} target="_blank" rel="noopener noreferrer" className="block group">
                        <div className="relative overflow-hidden rounded-lg border-2 border-slate-200 dark:border-slate-700 themed-hover-border transition-all duration-300">
                          <img 
                            src={editedTrade.trade_link} 
                            alt="Trade Chart" 
                            className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </div>
                      </a>
                    </div>
                  ) : null}

                  {isTradingInstitutional && editedTrade?.liquidity_taken ? (
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Liquidity Link</label>
                      <a href={editedTrade.liquidity_taken} target="_blank" rel="noopener noreferrer" className="block group">
                        <div className="relative overflow-hidden rounded-lg border-2 border-slate-200 dark:border-slate-700 themed-hover-border transition-all duration-300">
                          <img 
                            src={editedTrade.liquidity_taken} 
                            alt="Liquidity Link" 
                            className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </div>
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className={`${labelClass} mb-2`}>Trade Chart URL</label>
                    <Input
                      type="text"
                      value={editedTrade?.trade_link ?? ''}
                      onChange={(e) => handleInputChange('trade_link', e.target.value)}
                      className={`${inputClass} placeholder:text-slate-400 dark:placeholder:text-slate-600`}
                      placeholder="https://..."
                    />
                  </div>
                  {isTradingInstitutional && (
                    <div>
                      <label className={`${labelClass} mb-2`}>Liquidity Link URL</label>
                      <Input
                        type="text"
                        value={editedTrade?.liquidity_taken ?? ''}
                        onChange={(e) => handleInputChange('liquidity_taken', e.target.value)}
                        className={`${inputClass} placeholder:text-slate-400 dark:placeholder:text-slate-600`}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Notes Section - same structure as NewTradeModal */}
            <div className="space-y-2">
              <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</Label>
              <Textarea
                value={editedTrade?.notes ?? ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={!isEditing}
                readOnly={!isEditing}
                className="min-h-[320px] shadow-sm bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-200/60 dark:border-slate-600 disabled:!opacity-100 themed-focus transition-all duration-300 placeholder:text-slate-500 dark:placeholder:text-slate-600 text-slate-900 dark:text-slate-100 disabled:cursor-not-allowed read-only:cursor-default"
                placeholder="Add your trade notes here..."
              />
            </div>

            {/* Delete confirm using AlertDialog */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient rounded-2xl">
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
                      className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                    >
                      Cancel
                    </Button>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Progress Dialog - same pattern as NewTradeModal */}
            <AlertDialog
              open={progressDialog.open}
              onOpenChange={() => {
                if (progressDialog.status !== 'loading') {
                  setProgressDialog({ open: false, status: 'loading', message: '', title: 'Update' });
                }
              }}
            >
              <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {progressDialog.status === 'loading' && (
                      <span className="font-semibold text-lg flex items-center gap-2" style={{ color: 'var(--tc-primary)' }}>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {progressDialog.title === 'Delete' ? 'Deleting Trade' : 'Updating Trade'}
                      </span>
                    )}
                    {progressDialog.status === 'success' && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-lg flex items-center gap-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {progressDialog.title === 'Delete' ? 'Trade Deleted Successfully' : 'Trade Updated Successfully'}
                      </span>
                    )}
                    {progressDialog.status === 'error' && (
                      <span className="text-red-500 dark:text-red-400 font-semibold text-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        {progressDialog.title === 'Delete' ? 'Error Deleting Trade' : 'Error Updating Trade'}
                      </span>
                    )}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <span className="text-slate-600 dark:text-slate-400">{progressDialog.message}</span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {progressDialog.status === 'error' && (
                  <AlertDialogFooter className="flex gap-3">
                    <Button
                      onClick={() => setProgressDialog({ open: false, status: 'loading', message: '', title: 'Update' })}
                      className="cursor-pointer rounded-xl border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800/70"
                    >
                      Close
                    </Button>
                  </AlertDialogFooter>
                )}
              </AlertDialogContent>
            </AlertDialog>

            {error && (
              <div className="rounded-lg bg-red-500/10 backdrop-blur-sm p-3 border border-red-500/20">
                <p className="text-sm text-red-500 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              {!isEditing ? (
                <>
                  <Button 
                    onClick={() => setIsEditing(true)} 
                    className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-5 py-2 group border-0"
                  >
                    <span className="relative z-10">Edit Trade</span>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60"
                  >
                    Delete Trade
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
                    <span className="relative z-10">{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}