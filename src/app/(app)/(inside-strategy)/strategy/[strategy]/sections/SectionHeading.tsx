'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionHeadingProps = {
  title: string;
  description: string;
  action?: ReactNode;
  containerClassName?: string;
  descriptionClassName?: string;
};

export function SectionHeading({
  title,
  description,
  action,
  containerClassName,
  descriptionClassName,
}: SectionHeadingProps) {
  return (
    <>
      <div className={cn('flex items-center justify-between mt-14 mb-2', containerClassName)}>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h2>
        {action ?? null}
      </div>
      <p className={cn('text-slate-500 dark:text-slate-400 mb-6', descriptionClassName)}>
        {description}
      </p>
    </>
  );
}
