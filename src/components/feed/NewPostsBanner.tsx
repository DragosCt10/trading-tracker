'use client';

import { ArrowUp } from 'lucide-react';

interface Props {
  count: number;
  onClick: () => void;
}

export default function NewPostsBanner({ count, onClick }: Props) {
  // Use grid-template-rows pattern (same as InlineCreatePostCard) — smoother than max-h trick
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${
        count > 0 ? '[grid-template-rows:1fr]' : '[grid-template-rows:0fr]'
      }`}
    >
      <div className={`min-h-0 overflow-hidden flex justify-center transition-opacity duration-200 motion-reduce:transition-none ${count > 0 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="py-2">
          <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-2 h-9 px-5 rounded-full border border-slate-400/60 dark:border-slate-500/70 text-slate-700 dark:text-slate-300 hover:border-slate-500 dark:hover:border-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-transparent text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            {count === 1 ? 'See 1 new post' : `See ${count} new posts`}
          </button>
        </div>
      </div>
    </div>
  );
}
