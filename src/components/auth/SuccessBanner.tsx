import { CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  message: ReactNode;
};

/**
 * Theme-aware success banner for auth forms. Uses role="status" + aria-live="polite"
 * so screen readers announce it without interrupting the user.
 */
export function SuccessBanner({ message }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg backdrop-blur-sm p-4 border animate-in fade-in slide-in-from-top-2 duration-300 bg-[var(--tc-primary)]/10 border-[var(--tc-primary)]/20"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-[var(--tc-primary)]" aria-hidden="true" />
        <span className="text-sm font-medium text-[var(--tc-primary)]">{message}</span>
      </div>
    </div>
  );
}
