import { ArrowRight, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  loading: boolean;
  disabled?: boolean;
  loadingLabel: string;
  children: ReactNode;
};

/**
 * Theme-gradient submit button used across all auth forms. Shows a spinner
 * + loadingLabel while submitting, otherwise renders children + an arrow.
 * Sliding highlight on hover is a CSS gradient overlay, no new keyframes.
 */
export function GradientSubmitButton({ loading, disabled, loadingLabel, children }: Props) {
  return (
    <Button
      size="lg"
      type="submit"
      disabled={disabled ?? loading}
      className="relative w-full h-12 overflow-hidden font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 group border-0 disabled:opacity-60 cursor-pointer"
      style={{
        background: `linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))`,
        boxShadow:
          '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
      }}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {loadingLabel}
          </>
        ) : (
          <>
            {children}
            <ArrowRight
              className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
              aria-hidden="true"
            />
          </>
        )}
      </span>
      {!loading && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
      )}
    </Button>
  );
}
