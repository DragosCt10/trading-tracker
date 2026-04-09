// hooks/useActionBarSelection.ts
'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useUserDetails } from '@/hooks/useUserDetails';
import type { Database } from '@/types/supabase';
import type { TradingMode } from '@/types/trade';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

export type Selection = {
  mode: TradingMode;
  activeAccount: AccountRow | null;
  description?: string;
  name?: string;
};

const DEFAULT_SELECTION: Selection = { mode: 'live', activeAccount: null };

// ---------- Module-level store ----------
// Keyed by userId so multi-tenancy leaks are impossible: each user's selection
// lives in its own slot. The ReactCache-as-state-container pattern we used to
// have was fragile (devs reached for invalidateQueries on a value that never
// refetches) and susceptible to bare-key leaks; this store replaces it.
//
// `state` is mutated in place via `setSelectionFor`; listeners are notified
// after each write. Non-hook code paths (server-action completion, modals,
// AppLayout seeding) use the exported helpers so the store is the single
// source of truth.

const state = new Map<string, Selection>();
const listeners = new Set<() => void>();

// BroadcastChannel for multi-tab coherence. When one tab mutates the
// selection, sibling tabs receive the message and apply it locally (without
// re-broadcasting) so every open tab stays in sync. Gated on typeof check
// so SSR / legacy environments don't explode.
const BROADCAST_CHANNEL_NAME = 'actionBar:selection';
type BroadcastPayload = { userId: string; selection: Selection };

let channel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  channel.addEventListener('message', (event: MessageEvent<BroadcastPayload>) => {
    const { userId, selection } = event.data ?? {};
    if (!userId || !selection) return;
    // Apply without re-broadcasting so tabs don't ping-pong forever.
    state.set(userId, selection);
    notify();
  });
}

function broadcast(userId: string, selection: Selection): void {
  if (!channel) return;
  try {
    channel.postMessage({ userId, selection } satisfies BroadcastPayload);
  } catch {
    // DataCloneError or similar — silently ignore; the local store still has
    // the truth for this tab.
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Read the selection for a specific user. Returns `DEFAULT_SELECTION` when nothing is stored. */
export function getSelectionFor(userId: string | undefined): Selection {
  if (!userId) return DEFAULT_SELECTION;
  return state.get(userId) ?? DEFAULT_SELECTION;
}

/** Write the selection for a specific user, notify subscribers, and broadcast to sibling tabs. */
export function setSelectionFor(userId: string | undefined, next: Selection): void {
  if (!userId) return;
  state.set(userId, next);
  notify();
  broadcast(userId, next);
}

/**
 * Seed the selection for a user only if nothing is stored yet. Called from
 * AppLayout on first render with server-resolved values so the first paint
 * matches the server without clobbering any in-session user changes.
 */
export function initSelectionFor(userId: string | undefined, initial: Selection): void {
  if (!userId) return;
  if (state.has(userId)) return;
  state.set(userId, initial);
  notify();
}

/**
 * Clear the selection for a user (e.g. on sign out). Prevents stale state
 * from being recycled if the same userId signs in again.
 */
export function clearSelectionFor(userId: string | undefined): void {
  if (!userId) return;
  if (!state.has(userId)) return;
  state.delete(userId);
  notify();
}

// ---------- Hook ----------

/**
 * ActionBar selection state, scoped by the current user id.
 *
 * Uses `useSyncExternalStore` so the hook stays React-correct and plays
 * nicely with the React Compiler (no useCallback-based memoisation
 * bottlenecks from the previous useQuery-as-state pattern).
 */
export function useActionBarSelection() {
  const { data: userDetails } = useUserDetails();
  const userId = userDetails?.user?.id;

  const selection = useSyncExternalStore(
    subscribe,
    // client snapshot
    () => getSelectionFor(userId),
    // server snapshot (SSR) — always default, client hydrates on mount
    () => DEFAULT_SELECTION
  );

  const setSelection = useCallback(
    (next: Selection) => {
      setSelectionFor(userId, next);
    },
    [userId]
  );

  return {
    selection,
    setSelection,
    userId,
    actionBarloading: false,
  };
}
