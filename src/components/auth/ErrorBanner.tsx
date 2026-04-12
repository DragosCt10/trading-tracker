import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  message: ReactNode;
  /** Optional secondary content (e.g. a recovery link for expired reset tokens). */
  children?: ReactNode;
};

/**
 * Destructive status banner for auth forms. Uses role="alert" + aria-live="assertive"
 * so screen readers announce it immediately. Parent should clear the error state
 * on next user input or submit — never auto-dismiss on a timer (WCAG 2.2.1).
 */
export function ErrorBanner({ message, children }: Props) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="rounded-lg bg-destructive/10 backdrop-blur-sm p-4 border border-destructive/20 animate-in fade-in slide-in-from-top-2 duration-300 space-y-3"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 shrink-0 text-destructive" aria-hidden="true" />
        <span className="text-sm font-medium text-destructive">{message}</span>
      </div>
      {children}
    </div>
  );
}
