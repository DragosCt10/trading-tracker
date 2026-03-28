'use client';

import { useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ChannelLogoPickerProps {
  currentUrl: string | null;
  onChange: (url: string | null) => void;
}

export function ChannelLogoPicker({ currentUrl, onChange }: ChannelLogoPickerProps) {
  const [inputValue, setInputValue] = useState(currentUrl ?? '');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    onChange(val.trim() || null);
  }

  function handleRemove() {
    setInputValue('');
    onChange(null);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center overflow-hidden shrink-0">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="Channel logo preview" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-5 h-5 text-slate-400" />
        )}
      </div>

      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <Input
          value={inputValue}
          onChange={handleChange}
          placeholder="https://example.com/logo.png"
          className="h-9 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-900 dark:text-slate-50 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 themed-focus"
        />
        {currentUrl && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors w-fit flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Remove logo
          </button>
        )}
      </div>
    </div>
  );
}
