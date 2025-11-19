'use client';

import { useState } from 'react';
import { Trade } from '@/types/trade';
import { createClient } from '@/utils/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';

// shadcn UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

interface TradeDetailsModalProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onTradeUpdated?: () => void;
}

export default function TradeDetailsModal({ trade, isOpen, onClose, onTradeUpdated }: TradeDetailsModalProps) {
  const { selection } = useActionBarSelection();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTrade, setEditedTrade] = useState<Trade | null>(trade);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

      const riskAmount = (Number(newRisk) / 100) * (selection.activeAccount?.account_balance || 0);
      const riskRewardRatio = Number(newRR) || 2;

      let calculatedProfit = 0;
      if (newOutcome === 'Win') {
        calculatedProfit = riskAmount * riskRewardRatio;
      } else if (newOutcome === 'Lose') {
        calculatedProfit = -riskAmount;
      }

      const pnlPercentage = newOutcome === 'Win'
        ? (Number(newRisk) * riskRewardRatio)
        : -Number(newRisk);

      setEditedTrade({
        ...editedTrade,
        [field]: value,
        calculated_profit: calculatedProfit,
        pnl_percentage: pnlPercentage
      });
    } else {
      setEditedTrade({
        ...editedTrade,
        [field]: value
      });
    }
  };

  const handleSave = async () => {
    if (!editedTrade || !editedTrade.id) return;
    try {
      setIsSaving(true);
      setError(null);
      const supabase = createClient();
      const tradingMode = selection.mode;

      const updateData = {
        trade_date: editedTrade.trade_date,
        trade_time: editedTrade.trade_time,
        day_of_week: editedTrade.day_of_week || '',
        quarter: editedTrade.quarter || '',
        market: editedTrade.market,
        direction: editedTrade.direction,
        setup_type: editedTrade.setup_type,
        liquidity: editedTrade.liquidity,
        sl_size: editedTrade.sl_size,
        risk_per_trade: editedTrade.risk_per_trade,
        trade_outcome: editedTrade.trade_outcome,
        risk_reward_ratio: editedTrade.risk_reward_ratio,
        risk_reward_ratio_long: editedTrade.risk_reward_ratio_long,
        trade_link: editedTrade.trade_link,
        liquidity_taken: editedTrade.liquidity_taken,
        mss: editedTrade.mss,
        break_even: editedTrade.break_even,
        reentry: editedTrade.reentry,
        news_related: editedTrade.news_related,
        local_high_low: editedTrade.local_high_low,
        mode: tradingMode,
        notes: editedTrade.notes,
        pnl_percentage: editedTrade.pnl_percentage,
        calculated_profit: editedTrade.calculated_profit,
        evaluation: editedTrade.evaluation,
        rr_hit_1_4: editedTrade.rr_hit_1_4,
        partials_taken: editedTrade.partials_taken,
        executed: editedTrade.executed,
        launch_hour: editedTrade.launch_hour
      };

      const { error: updateError } = await (supabase
        .from(`${tradingMode}_trades`) as any)
        .update(updateData)
        .eq('id', editedTrade.id);

      if (updateError) {
        console.error('Error updating trade:', updateError);
        throw updateError;
      }

      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      setIsEditing(false);
      if (onTradeUpdated) onTradeUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save trade. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!trade || !trade.id) return;
    try {
      setIsDeleting(true);
      setError(null);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from(`${trade.mode || selection.mode}_trades`)
        .delete()
        .eq('id', trade.id);

      if (deleteError) throw deleteError;

      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      if (onTradeUpdated) onTradeUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const renderStatusBadge = (value: boolean | string) => {
    const isActive = typeof value === 'boolean' ? value : value === 'Yes';
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
        isActive ? 'bg-emerald-100 text-emerald-500' : 'bg-slate-100 text-slate-800'
      }`}>
        {isActive ? 'Yes' : 'No'}
      </span>
    );
  };

  const renderOutcomeBadge = (outcome: string) => {
    const colors: Record<string, string> = {
      'Win': 'bg-emerald-100 text-emerald-500',
      'Lose': 'bg-red-100 text-red-500',
      'Break Even': 'bg-amber-100 text-amber-600'
    };
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
        colors[outcome] || 'bg-slate-100 text-slate-800'
      }`}>
        {outcome}
      </span>
    );
  };

  const renderField = (
    label: string,
    field: keyof Trade,
    type: 'text' | 'number' | 'select' | 'boolean' | 'outcome' = 'text',
    options?: string[]
  ) => {
    if (!editedTrade) return null;
    const value = editedTrade[field];

    if (!isEditing) {
      if (type === 'boolean') {
        return (
          <div className="mb-2">
            <dt className="text-sm font-medium text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm">{renderStatusBadge(value as boolean)}</dd>
          </div>
        );
      }
      if (type === 'outcome') {
        const outcome = value as string;
        return (
          <div className="mb-2">
            <dt className="text-sm font-medium text-slate-500">{label}</dt>
            <dd className="mt-1">{renderOutcomeBadge(outcome)}</dd>
          </div>
        );
      }
      if (type === 'number') {
        const displayValue = typeof value === 'number' ? value.toFixed(2) : value;
        if (field === 'pnl_percentage' || field === 'risk_per_trade') {
          return (
            <div className="mb-2">
              <dt className="text-sm font-medium text-slate-500">{label}</dt>
              <dd className={`mt-1 text-sm ${field === 'pnl_percentage'
                ? (editedTrade.trade_outcome === 'Lose'
                  ? 'text-red-500'
                  : 'text-emerald-500')
                : 'text-slate-900'}`}>
                {`${displayValue}%`}
              </dd>
            </div>
          );
        } else {
          return (
            <div className="mb-2">
              <dt className="text-sm font-medium text-slate-500">{label}</dt>
              <dd className="mt-1 text-sm text-slate-900">{displayValue}</dd>
            </div>
          );
        }
      }
      return (
        <div className="mb-2">
          <dt className="text-sm font-medium text-slate-500">{label}</dt>
          <dd className="mt-1 text-sm text-slate-900">{value as string}</dd>
        </div>
      );
    }

    // For P&L percentage, make it read-only
    if (field === 'pnl_percentage') {
      const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
      const displayValue = numValue.toFixed(2);
      return (
        <div className="mb-2">
          <label className="block text-sm font-medium text-slate-700">{label}</label>
          <input
            type="text"
            value={`${displayValue}%`}
            readOnly
            className="mt-1 w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
          />
        </div>
      );
    }

    // For Risk, make it editable only in editing mode
    if (field === 'risk_per_trade') {
      const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
      const displayValue = numValue.toFixed(2);
      if (isEditing) {
        return (
          <div className="mb-2">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <input
              type="number"
              value={isNaN(value as number) ? '' : value as number}
              onChange={e => {
                const val = e.target.value;
                handleInputChange(field, val === '' ? '' : parseFloat(val));
              }}
              className="mt-1 w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        );
      } else {
        return (
          <div className="mb-2">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <input
              type="text"
              value={`${displayValue}%`}
              readOnly
              className="mt-1 w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
            />
          </div>
        );
      }
    }

    switch (type) {
      case 'number':
        return (
          <div className="mb-2">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <input
              type="number"
              value={isNaN(value as number) ? '' : value as number}
              onChange={e => {
                const val = e.target.value;
                handleInputChange(field, val === '' ? '' : parseFloat(val));
              }}
              className="mt-1 w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        );
      case 'select':
        return (
          <div className="mb-2">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <select
              value={value as string}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className="mt-1 w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              {options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      case 'boolean':
        return (
          <div className="mb-2">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <select
              value={value ? 'true' : 'false'}
              onChange={(e) => handleInputChange(field, e.target.value === 'true')}
              className="mt-1 w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        );
      case 'outcome':
        return (
          <div className="mb-2">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <select
              value={value as string}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className="mt-1 w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="Win">Win</option>
              <option value="Lose">Lose</option>
            </select>
          </div>
        );
      default:
        return (
          <div className="mb-2">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <input
              type="text"
              value={value as string}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className="mt-1 w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        );
    }
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto fade-content data-[state=open]:fade-content data-[state=closed]:fade-content">
        <div className="absolute top-3 right-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span className="sr-only">Close</span>
          </Button>
        </div>
        
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">Trade Details</AlertDialogTitle>
          <AlertDialogDescription>
            Detailed information about the selected trade.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="p-0 px-0 mt-4">
          <Card className="shadow-none border-none">
            <CardContent className="px-0">
              {error && (
                <Card className="mb-4 bg-red-50 border border-red-200">
                  <CardContent className="text-red-500 px-4 py-3">{error}</CardContent>
                </Card>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Basic Information */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">Basic Information</h3>
                  <dl>
                    {renderField('Date', 'trade_date')}
                    {renderField('Time', 'trade_time')}
                    {renderField('Day', 'day_of_week', 'select', DAY_OF_WEEK_OPTIONS)}
                    {renderField('Market', 'market', 'select', MARKET_OPTIONS)}
                    {renderField('Direction', 'direction', 'select', ['Long', 'Short'])}
                    {renderField('Setup Type', 'setup_type', 'select', SETUP_OPTIONS)}
                    {renderField('Outcome', 'trade_outcome', 'outcome', ['Win', 'Lose'])}
                  </dl>
                </div>
                {/* Risk Management */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">Risk Management</h3>
                  <dl>
                    {renderField('Risk', 'risk_per_trade', 'number')}
                    {renderField('Risk/Reward Ratio', 'risk_reward_ratio', 'number')}
                    {renderField('Risk/Reward Ratio (Long)', 'risk_reward_ratio_long', 'number')}
                    {renderField('SL Size', 'sl_size', 'number')}
                    {renderField('Liquidity', 'liquidity', 'select', LIQUIDITY_OPTIONS)}
                    {renderField('P&L Percentage', 'pnl_percentage', 'number')}
                    {/* Calculated Profit (read-only) */}
                    {editedTrade && (
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-slate-700">Calculated Profit</label>
                        <input
                          type="text"
                          value={typeof editedTrade.calculated_profit === 'number'
                            ? editedTrade.calculated_profit.toFixed(2)
                            : editedTrade.calculated_profit
                          }
                          readOnly
                          className="mt-1 w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
                        />
                      </div>
                    )}
                  </dl>
                </div>
                {/* Trade Analysis */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">Trade Analysis</h3>
                  <dl>
                    {renderField('MSS', 'mss', 'select', MSS_OPTIONS)}
                    {renderField('Break Even', 'break_even', 'boolean')}
                    {renderField('Re-entry', 'reentry', 'boolean')}
                    {renderField('News Related', 'news_related', 'boolean')}
                    {renderField('Local High/Low', 'local_high_low', 'boolean')}
                    {renderField('Evaluation Grade', 'evaluation', 'select', EVALUATION_OPTIONS)}
                    {renderField('1.4RR Hit', 'rr_hit_1_4', 'boolean')}
                    {renderField('Partials', 'partials_taken', 'boolean')}
                    {renderField('Executed', 'executed', 'boolean')}
                    {renderField('Launch Hour', 'launch_hour', 'boolean')}
                  </dl>
                </div>
              </div>
              {/* Trade Link */}
              <div className="mt-4">
                <h3 className="text-base font-semibold text-slate-900 mb-2">Trade Link</h3>
                <dl>
                  {renderField('Trade', 'trade_link')}
                  {renderField('Liquidity Taken', 'liquidity_taken')}
                </dl>
              </div>
              {/* Notes */}
              <div className="mt-4">
                <h3 className="text-base font-semibold text-slate-900 mb-2">Notes</h3>
                <textarea
                  value={editedTrade?.notes ?? ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="mt-1 w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm"
                  rows={8}
                  disabled={!isEditing}
                  readOnly={!isEditing}
                />
              </div>
              {/* Delete confirm using AlertDialog */}
              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      <span className="text-red-500 font-semibold text-base">Confirm Delete</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      <span className="text-slate-500 mb-1">Are you sure you want to delete this trade? This action cannot be undone.</span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex gap-3">
                    <AlertDialogAction
                      asChild
                    >
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-white"
                      >
                        {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                      </Button>
                    </AlertDialogAction>
                    <AlertDialogCancel
                      asChild
                    >
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {/* Action Buttons */}
              <div className="mt-6 flex justify-end gap-2">
                {!isEditing ? (
                  <>
                    <Button onClick={() => setIsEditing(true)} variant="default">
                      Edit Trade
                    </Button>
                    <Button
                      onClick={() => setShowDeleteConfirm(true)}
                      variant="destructive"
                      className='text-white'
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
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}