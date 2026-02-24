'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';

interface AddStrategyCardProps {
  onClick: () => void;
}

export const AddStrategyCard: React.FC<AddStrategyCardProps> = ({ onClick }) => {
  return (
    <Card
      onClick={onClick}
      className="relative overflow-hidden border-dashed border-2 border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 shadow-none backdrop-blur-sm cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-200"
    >
      <div className="relative p-6 flex flex-col items-center justify-center h-full min-h-[320px]">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 themed-header-icon-box">
          <Plus className="w-8 h-8" />
        </div>
        <p className="text-base font-medium text-slate-500 dark:text-slate-400 dark:text-slate-100">
          Create new strategy
        </p>
      </div>
    </Card>
  );
};
