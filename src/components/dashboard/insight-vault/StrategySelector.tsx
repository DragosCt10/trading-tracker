'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Strategy {
  id: string;
  name: string;
}

interface StrategySelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  strategies: Strategy[];
  /** Legacy single strategy_id for backward compatibility (NoteDetailsModal) */
  legacyStrategyId?: string | null;
  /** Called when legacyStrategyId should change (NoteDetailsModal backward compat) */
  onLegacyStrategyIdChange?: (id: string | null) => void;
  /** Prefix for checkbox IDs to avoid collisions between modals */
  idPrefix?: string;
}

export default function StrategySelector({
  selectedIds,
  onChange,
  strategies,
  legacyStrategyId,
  onLegacyStrategyIdChange,
  idPrefix = 'strategy',
}: StrategySelectorProps) {
  const handleCheckedChange = (strategyId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      const newIds = [...selectedIds, strategyId];
      onChange(newIds);
      // Backward compat: set legacy strategy_id to first selected
      if (onLegacyStrategyIdChange && selectedIds.length === 0) {
        onLegacyStrategyIdChange(strategyId);
      }
    } else {
      const newIds = selectedIds.filter((id) => id !== strategyId);
      onChange(newIds);
      // Backward compat: clear legacy strategy_id if last one removed
      if (onLegacyStrategyIdChange) {
        if (newIds.length === 0) {
          onLegacyStrategyIdChange(null);
        } else if (newIds.length === 1) {
          onLegacyStrategyIdChange(newIds[0]);
        }
      }
    }
  };

  // Merge selectedIds with legacyStrategyId for display (NoteDetailsModal compat)
  const isSelected = (strategyId: string) =>
    selectedIds.includes(strategyId) || legacyStrategyId === strategyId;

  const selectedCount = (() => {
    const unique = new Set(selectedIds);
    if (legacyStrategyId) unique.add(legacyStrategyId);
    return unique.size;
  })();

  return (
    <div className="space-y-1.5">
      <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
        Strategies (Optional)
      </Label>
      <div className="border border-slate-200/60 dark:border-slate-600 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:dark:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        {strategies.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No strategies available</p>
        ) : (
          <div className="space-y-2 pr-1">
            {strategies.map((strategy) => (
              <div key={strategy.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`${idPrefix}-${strategy.id}`}
                  checked={isSelected(strategy.id)}
                  onCheckedChange={(checked) => handleCheckedChange(strategy.id, checked)}
                  className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 themed-checkbox data-[state=checked]:!text-white transition-colors duration-150"
                />
                <Label
                  htmlFor={`${idPrefix}-${strategy.id}`}
                  className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300"
                >
                  {strategy.name}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedCount > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {selectedCount} strateg{selectedCount === 1 ? 'y' : 'ies'} selected
        </p>
      )}
    </div>
  );
}
