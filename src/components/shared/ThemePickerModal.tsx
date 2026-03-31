'use client';

import { Check, X, Palette } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { COLOR_THEMES, type ColorThemeId } from '@/constants/colorThemes';
import { useColorTheme } from '@/hooks/useColorTheme';

interface ThemePickerModalProps {
  open: boolean;
  onClose: () => void;
}

export function ThemePickerModal({ open, onClose }: ThemePickerModalProps) {
  const { colorTheme, changeColorTheme } = useColorTheme();

  const handleSelect = (id: ColorThemeId) => {
    changeColorTheme(id);
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 overflow-hidden max-h-[70vh] flex flex-col">
        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="orb-bg-1 absolute -top-32 -left-24 w-[300px] h-[300px] rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="orb-bg-2 absolute -bottom-32 -right-24 w-[300px] h-[300px] rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        </div>

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--tc-primary)] to-transparent opacity-60" />

        {/* Header */}
        <div className="relative shrink-0 px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50">
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <AlertDialogTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-1.5 rounded-lg" style={{ background: 'var(--tc-subtle)', border: '1px solid var(--tc-border)' }}>
                  <Palette className="h-3.5 w-3.5" style={{ color: 'var(--tc-primary)' }} />
                </div>
                Color Theme
              </AlertDialogTitle>
              <button
                onClick={onClose}
                className="rounded-sm ring-offset-background transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <AlertDialogDescription className="sr-only">
              Choose a color theme for the application.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Theme list */}
        <div className="relative px-4 py-4 grid grid-cols-2 gap-2.5 overflow-y-auto flex-1">
          {COLOR_THEMES.map((theme) => {
            const isActive = colorTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                className={`
                  relative flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-all duration-200
                  hover:scale-[1.02] active:scale-[0.98]
                  ${isActive
                    ? 'border-slate-400/60 dark:border-slate-500/60 bg-slate-100/80 dark:bg-slate-800/60 shadow-sm'
                    : 'border-slate-200/70 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/20 hover:bg-white/70 dark:hover:bg-slate-800/40'
                  }
                `}
              >
                {/* Gradient swatch */}
                <div
                  className="relative shrink-0 w-12 h-12 rounded-md overflow-hidden shadow-sm border border-black/10 dark:border-white/10"
                  style={{
                    background: `linear-gradient(135deg, ${theme.preview.bgDark} 0%, ${theme.preview.primary} 65%, ${theme.preview.accent} 100%)`,
                  }}
                >
                  <div
                    className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white/40"
                    style={{ background: theme.preview.bgLight }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 w-full">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                    {theme.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                    {theme.description}
                  </p>
                  {/* Color dots */}
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {[theme.preview.primary, theme.preview.accent, theme.preview.bgDark, theme.preview.bgLight].map((color, i) => (
                      <span
                        key={i}
                        className="inline-block w-2 h-2 rounded-full border border-black/10 dark:border-white/10"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Active checkmark */}
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-800 dark:bg-slate-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white dark:text-slate-800" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
