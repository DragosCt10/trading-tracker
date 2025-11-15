'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  tooltipContent?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  tooltipContent,
  className,
  align = 'center',
}) => {
  const alignHeader = align === 'center' ? 'items-center text-center' : '';
  const alignBody =
    align === 'center' ? 'items-center text-center' : 'items-start text-left';

  return (
    <Card className={cn('border shadow-none', className)}>
      <CardHeader className={cn('pb-2', alignHeader)}>
        <div className="flex items-center justify-center text-sm font-medium text-slate-500">
          <CardTitle className="text-sm font-medium text-slate-500">
            {title}
          </CardTitle>
          {tooltipContent && (
            <TooltipProvider>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    tabIndex={0}
                    className="ml-1 inline-flex h-4 w-4 items-center justify-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label="More info"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="center"
                  className="w-72 text-xs sm:text-sm bg-white border p-4"
                  sideOffset={6}
                >
                  {tooltipContent}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent
        className={cn('pt-1 flex flex-col gap-1', alignBody)}
      >
        {value}
      </CardContent>
    </Card>
  );
};
