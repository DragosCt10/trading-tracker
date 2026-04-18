/**
 * Share-link constants & types shared between server actions and client UI.
 *
 * Split out of `src/lib/server/tradeLedgerShares.ts` because Next.js
 * `"use server"` files may only export async functions — constants and
 * types have to live elsewhere.
 */

export const SHARE_EXPIRY_CHOICES = [7, 30, 90, 365] as const;
export type ShareExpiryDays = (typeof SHARE_EXPIRY_CHOICES)[number];
export const DEFAULT_SHARE_EXPIRY_DAYS: ShareExpiryDays = 30;
