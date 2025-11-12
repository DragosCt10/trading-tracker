'use client';

import { useState } from 'react';
import { Trade } from '@/types/trade';
import { createClient } from '@/utils/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';

interface TradeDetailsModalProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onTradeUpdated?: () => void;
}

export default function TradeDetailsModal({ trade, isOpen, onClose, onTradeUpdated }: TradeDetailsModalProps) {
  const { selection, actionBarloading } = useActionBarSelection();
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
      // Use the new value for the changed field, and current values for others
      const newRisk = field === 'risk_per_trade' ? value : editedTrade.risk_per_trade;
      const newRR = field === 'risk_reward_ratio' ? value : editedTrade.risk_reward_ratio;
      const newOutcome = field === 'trade_outcome' ? value : editedTrade.trade_outcome;

      // Calculate P&L based on risk percentage and outcome
      const riskAmount = (Number(newRisk) / 100) * (selection.activeAccount?.account_balance || 0);
      const riskRewardRatio = Number(newRR) || 2;

      let calculatedProfit = 0;
      if (newOutcome === 'Win') {
        calculatedProfit = riskAmount * riskRewardRatio;
      } else if (newOutcome === 'Lose') {
        calculatedProfit = -riskAmount;
      }

      // Calculate P&L percentage based on the risk amount and RR
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
      // For all other fields, just update the field directly
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

      // Use the current trading mode from context
      const tradingMode = selection.mode;

      // Update the trade in the database
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

      // Invalidate and refetch trades query
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      
      setIsEditing(false);
      if (onTradeUpdated) onTradeUpdated();
      onClose();
    } catch (err: any) {
      console.error('Error in handleSave:', err);
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

      // Delete the trade from the database
      const { error: deleteError } = await supabase
        .from(`${trade.mode || selection.mode}_trades`)
        .delete()
        .eq('id', trade.id);

      if (deleteError) throw deleteError;

      // Invalidate and refetch trades query
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
        isActive ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-800'
      }`}>
        {isActive ? 'Yes' : 'No'}
      </span>
    );
  };

  const renderOutcomeBadge = (outcome: string) => {
    const colors = {
      'Win': 'bg-green-100 text-green-800',
      'Lose': 'bg-red-100 text-red-800',
      'Break Even': 'bg-amber-100 text-amber-800'
    };
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
        colors[outcome as keyof typeof colors] || 'bg-stone-100 text-stone-800'
      }`}>
        {outcome}
      </span>
    );
  };

  const renderField = (label: string, field: keyof Trade, type: 'text' | 'number' | 'select' | 'boolean' | 'outcome' = 'text', options?: string[]) => {
    if (!editedTrade) return null;
    
    const value = editedTrade[field];

    if (!isEditing) {
      if (type === 'boolean') {
        return (
          <div className="mb-4">
            <dt className="text-sm font-medium text-stone-500">{label}</dt>
            <dd className="mt-1 text-sm text-stone-900">{renderStatusBadge(value as boolean)}</dd>
          </div>
        );
      }
      if (type === 'outcome') {
        const outcome = value as string;
        const badgeColor =
          outcome === 'Win'
            ? 'bg-green-100 text-green-800'
            : outcome === 'Lose'
            ? 'bg-red-100 text-red-800'
            : 'bg-stone-100 text-stone-800';
        return (
          <div className="mb-4">
            <dt className="text-sm font-medium text-stone-500">{label}</dt>
            <dd className="mt-1">
              <span className={`px-3 py-1 rounded-full font-semibold text-sm ${badgeColor}`}>
                {outcome}
              </span>
            </dd>
          </div>
        );
      }
      if (type === 'number') {
        const displayValue = typeof value === 'number' ? value.toFixed(2) : value;
        if (field === 'pnl_percentage' || field === 'risk_per_trade') {
          return (
            <div className="mb-4">
              <dt className="text-sm font-medium text-stone-500">{label}</dt>
              <dd className={`mt-1 text-sm ${field === 'pnl_percentage' && editedTrade.trade_outcome === 'Lose' ? 'text-red-600' : 'text-stone-900'}`}>
                {`${displayValue}%`}
              </dd>
            </div>
          );
        } else {
          return (
            <div className="mb-4">
              <dt className="text-sm font-medium text-stone-500">{label}</dt>
              <dd className="mt-1 text-sm text-stone-900">{displayValue}</dd>
            </div>
          );
        }
      }
      return (
        <div className="mb-4">
          <dt className="text-sm font-medium text-stone-500">{label}</dt>
          <dd className="mt-1 text-sm text-stone-900">{value as string}</dd>
        </div>
      );
    }

    // For P&L percentage, make it read-only
    if (field === 'pnl_percentage') {
      const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
      const displayValue = numValue.toFixed(2);
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700">{label}</label>
          <input
            type="text"
            value={`${displayValue}%`}
            readOnly
            className="mt-1 w-full bg-stone-50 border border-stone-200 text-stone-700 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
          />
        </div>
      );
    }
    // For Risk, make it read-only with %
    if (field === 'risk_per_trade') {
      const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
      const displayValue = numValue.toFixed(2);
      if (isEditing) {
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700">{label}</label>
            <input
              type="number"
              value={isNaN(value as number) ? '' : value as number}
              onChange={e => {
                const val = e.target.value;
                handleInputChange(field, val === '' ? '' : parseFloat(val));
              }}
              className="mt-1 w-full bg-white border border-stone-200 text-stone-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        );
      } else {
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700">{label}</label>
            <input
              type="text"
              value={`${displayValue}%`}
              readOnly
              className="mt-1 w-full bg-stone-50 border border-stone-200 text-stone-700 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
            />
          </div>
        );
      }
    }

    switch (type) {
      case 'number':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700">{label}</label>
            <input
              type="number"
              value={isNaN(value as number) ? '' : value as number}
              onChange={e => {
                const val = e.target.value;
                handleInputChange(field, val === '' ? '' : parseFloat(val));
              }}
              className="mt-1 w-full bg-white border border-stone-200 text-stone-700 rounded-lg px-3 py-2 text-sm hover:border-stone-300 focus:border-stone-400 focus:ring-none transition-colors duration-200"
            />
          </div>
        );
      case 'select':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700">{label}</label>
            <select
              value={value as string}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className="mt-1 w-full bg-white border border-stone-200 text-stone-700 rounded-lg px-3 py-2 text-sm hover:border-stone-300 focus:border-stone-400 focus:ring-none transition-colors duration-200"
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700">{label}</label>
            <select
              value={value ? 'true' : 'false'}
              onChange={(e) => handleInputChange(field, e.target.value === 'true')}
              className="mt-1 w-full bg-white border border-stone-200 text-stone-700 rounded-lg px-3 py-2 text-sm hover:border-stone-300 focus:border-stone-400 focus:ring-none transition-colors duration-200"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        );
      case 'outcome':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700">{label}</label>
            <select
              value={value as string}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className="mt-1 w-full bg-white border border-stone-200 text-stone-700 rounded-lg px-3 py-2 text-sm hover:border-stone-300 focus:border-stone-400 focus:ring-none transition-colors duration-200"
            >
              <option value="Win">Win</option>
              <option value="Lose">Lose</option>
            </select>
          </div>
        );
      default:
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700">{label}</label>
            <input
              type="text"
              value={value as string}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className="mt-1 w-full bg-white border border-stone-200 text-stone-700 rounded-lg px-3 py-2 text-sm hover:border-stone-300 focus:border-stone-400 focus:ring-none transition-colors duration-200"
            />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-sm w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-stone-900">Trade Details</h2>
            <button
              onClick={onClose}
              className="inline-grid place-items-center border align-middle select-none font-sans font-medium text-center transition-all duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-sm min-w-[38px] min-h-[38px] rounded-md bg-transparent border-transparent text-stone-800 hover:bg-stone-800/5 hover:border-stone-800/5 shadow-none hover:shadow-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Basic Information */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-stone-900 mb-2">Basic Information</h3>
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
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-stone-900 mb-2">Risk Management</h3>
              <dl>
                {renderField('Risk', 'risk_per_trade', 'number')}
                {renderField('Risk/Reward Ratio', 'risk_reward_ratio', 'number')}
                {renderField('Risk/Reward Ratio (Long)', 'risk_reward_ratio_long', 'number')}
                {renderField('SL Size', 'sl_size', 'number')}
                {renderField('Liquidity', 'liquidity', 'select', LIQUIDITY_OPTIONS)}
                {renderField('P&L Percentage', 'pnl_percentage', 'number')}
                {/* Calculated Profit (read-only) */}
                {(() => {
                  if (!editedTrade) return null;
                  const value = editedTrade.calculated_profit;
                  const displayValue = typeof value === 'number' ? value.toFixed(2) : value;
                  return (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-stone-700">Calculated Profit</label>
                      <input
                        type="text"
                        value={displayValue}
                        readOnly
                        className="mt-1 w-full bg-stone-50 border border-stone-200 text-stone-700 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
                      />
                    </div>
                  );
                })()}
              </dl>
            </div>

            {/* Trade Analysis */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-stone-900 mb-2">Trade Analysis</h3>
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
            <h3 className="text-lg font-medium text-stone-900 mb-2">Trade Link</h3>
            <dl>
              {renderField('Trade', 'trade_link')}
              {renderField('Liquidity Taken', 'liquidity_taken')}
            </dl>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <h3 className="text-lg font-medium text-stone-900 mb-2">Notes</h3>
            <textarea
              value={editedTrade?.notes ?? ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="mt-1 w-full bg-white border border-stone-200 text-stone-700 rounded-lg px-3 py-2 text-sm hover:border-stone-300 focus:border-stone-400 focus:ring-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              rows={16}
            />
          </div>

          {showDeleteConfirm && (
            <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-red-600 font-medium mb-2">Are you sure you want to delete this trade?</p>
              <p className="text-red-600 mb-4">This action cannot be undone.</p>
              <div className="flex gap-4">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-linear-to-b from-red-500 to-red-600 border-red-600 text-stone-50 rounded-lg hover:bg-linear-to-b hover:from-red-600 hover:to-red-600 hover:border-red-600 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.35),inset_0_-2px_0px_rgba(0,0,0,0.18)] after:pointer-events-none transition antialiased"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-linear-to-b from-white to-white border-stone-200 text-stone-700 rounded-lg hover:bg-linear-to-b hover:from-stone-50 hover:to-stone-50 hover:border-stone-200 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.35),inset_0_-1px_0px_rgba(0,0,0,0.20)] after:pointer-events-none transition antialiased"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-linear-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-linear-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
                >
                  Edit Trade
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-linear-to-b from-red-500 to-red-600 border-red-600 text-stone-50 rounded-lg hover:bg-linear-to-b hover:from-red-600 hover:to-red-600 hover:border-red-600 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.35),inset_0_-2px_0px_rgba(0,0,0,0.18)] after:pointer-events-none transition antialiased"
                >
                  Delete Trade
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedTrade(trade);
                  }}
                  className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-linear-to-b from-white to-white border-stone-200 text-stone-700 rounded-lg hover:bg-linear-to-b hover:from-stone-50 hover:to-stone-50 hover:border-stone-200 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.35),inset_0_-1px_0px_rgba(0,0,0,0.20)] after:pointer-events-none transition antialiased"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-linear-to-b from-green-500 to-green-600 border-green-600 text-stone-50 rounded-lg hover:bg-linear-to-b hover:from-green-600 hover:to-green-600 hover:border-green-600 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.35),inset_0_-2px_0px_rgba(0,0,0,0.18)] after:pointer-events-none transition antialiased"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 