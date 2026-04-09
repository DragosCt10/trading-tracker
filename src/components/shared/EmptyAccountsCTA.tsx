'use client';

import { CreateAccountAlertDialog } from '@/components/CreateAccountModal';

/**
 * Rendered inside ActionBar when the current user has zero accounts across
 * every mode. Without this branch, the auto-apply effect picks nothing and
 * `isInitializing` stays true forever, leaving the UI stuck on a pulsing
 * skeleton. Shows a short prompt next to the existing create-account button
 * so the user can create their first account inline.
 */
export function EmptyAccountsCTA() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2"
    >
      <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
        No accounts yet
      </span>
      <CreateAccountAlertDialog />
    </div>
  );
}
