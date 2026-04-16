/**
 * Shared utilities for responsive visual regression tests.
 */

import { readFileSync, existsSync } from 'fs';
import type { Page } from '@playwright/test';

// ── env loading ────────────────────────────────────────────────────────────
// Copied from auth-flow.spec.ts so each file stays self-contained.

export function loadEnv(files: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  for (const file of files) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = val;
    }
  }
  return env;
}

// ── dynamic content masking ────────────────────────────────────────────────
// Call this before toHaveScreenshot() on authenticated pages to prevent
// daily failures caused by live P&L values, equity curves, and dates.
//
// NOTE: Selectors are intentionally broad. If class-based targeting misses
// elements, add data-testid="stat-value" / data-date attributes to the
// relevant stat components and update the selectors here.

export async function maskDynamicContent(page: Page): Promise<void> {
  await page.evaluate(() => {
    // 1. Hide all Recharts containers (equity curves, bar charts, etc.)
    document
      .querySelectorAll<HTMLElement>(
        '.recharts-responsive-container, .recharts-wrapper, .recharts-surface'
      )
      .forEach((el) => {
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
      });

    // 2. Blank stat number text (P&L, win rate, trade count, Sharpe ratio…)
    //    Targets elements with explicit data-testid, or common numeric display patterns.
    document
      .querySelectorAll<HTMLElement>(
        '[data-stat-value], [data-testid="stat-value"], [data-testid="stat-number"]'
      )
      .forEach((el) => {
        el.textContent = '—';
      });

    // 3. Blank date and time strings
    document
      .querySelectorAll<HTMLElement>('[data-date], time, [data-testid="date"]')
      .forEach((el) => {
        el.textContent = '0000-00-00';
      });
  });
}

// ── session expiry guard ───────────────────────────────────────────────────
// Call in beforeEach of authenticated spec files.
// If storageState expired (Supabase default TTL ~1 hour), redirect to /login
// happens silently — this surfaces a clear failure message instead.

export async function assertAuthenticated(page: Page, expectedPath: string): Promise<void> {
  const url = page.url();
  if (url.includes('/login')) {
    throw new Error(
      `Session expired — page redirected to /login instead of ${expectedPath}.\n` +
      `Re-run: npx playwright test tests/e2e/responsive/auth.setup.ts`
    );
  }
}
