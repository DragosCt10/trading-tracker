import { createClient as createAnonClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { getPaymentProvider } from '@/lib/billing';
import { ensureDefaultAccountForUserId } from '@/lib/server/accounts';
import type { WebhookAction } from './provider.interface';

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

// ── User resolution ──────────────────────────────────────────────────────────

/** O(1) lookup via direct auth.users query instead of paginating all users. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  try {
    const { data, error } = await (supabase as ReturnType<typeof createServiceRoleClient> & { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }).rpc('get_user_id_by_email', { p_email: normalizedEmail });
    if (!error && data) return data as string;
  } catch {
    // RPC not available, fall back to admin API
  }

  const perPage = 1000;
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error(`[billing/webhook] auth lookup failed email=${normalizedEmail} page=${page}`, error);
      return null;
    }
    const users = data?.users ?? [];
    const user = users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
    if (user) return user.id;
    if (!users.length || users.length < perPage) return null;
    page += 1;
  }
}

/**
 * Ensure a Supabase user exists for a checkout email.
 * Creates the user + default account + sends magic link if new.
 */
export async function ensureUserForCheckoutEmail(email: string, providerSource: string): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const existingUserId = await findUserIdByEmail(normalizedEmail);
  if (existingUserId) return existingUserId;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
    user_metadata: { source: `${providerSource}_checkout` },
  });

  if (error) {
    console.error(`[billing/webhook] createUser failed email=${normalizedEmail}`, error);
    return findUserIdByEmail(normalizedEmail);
  }

  const newUserId = data.user?.id ?? null;
  if (!newUserId) return null;

  await ensureDefaultAccountForUserId(newUserId);

  const anonClient = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { error: otpError } = await anonClient.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: false, emailRedirectTo: `${getAppUrl()}/login` },
  });
  if (otpError) {
    console.error(`[billing/webhook] signInWithOtp failed email=${normalizedEmail}`, otpError);
  }

  console.log(`[billing/webhook] created_user_from_checkout userId=${newUserId}`);
  return newUserId;
}

// ── Idempotency ──────────────────────────────────────────────────────────────

const processedWebhookIds = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

// ── Pending price cache ───────────────────────────────────────────────────────
// order_created fires before subscription_created in LemonSqueezy. For fresh
// users there is no subscription row yet when the order arrives, so the UPDATE
// finds 0 rows and price data is lost. We cache the price here and apply it
// after the subscription upsert in subscription.updated.

interface PendingPrice { amountCents: number; taxCents: number; currency: string; ts: number }
const pendingPriceByCustomerId = new Map<string, PendingPrice>();
const PRICE_CACHE_TTL_MS = 10 * 60 * 1000;

function storePendingPrice(providerCustomerId: string, price: Omit<PendingPrice, 'ts'>): void {
  const now = Date.now();
  for (const [k, v] of pendingPriceByCustomerId.entries()) {
    if (now - v.ts > PRICE_CACHE_TTL_MS) pendingPriceByCustomerId.delete(k);
  }
  pendingPriceByCustomerId.set(providerCustomerId, { ...price, ts: now });
}

function consumePendingPrice(providerCustomerId: string): Omit<PendingPrice, 'ts'> | null {
  const entry = pendingPriceByCustomerId.get(providerCustomerId);
  if (!entry) return null;
  pendingPriceByCustomerId.delete(providerCustomerId);
  const { ts: _ts, ...price } = entry;
  return price;
}

export function isAlreadyProcessed(webhookId: string): boolean {
  const now = Date.now();
  for (const [id, ts] of Array.from(processedWebhookIds.entries())) {
    if (now - ts > IDEMPOTENCY_TTL_MS) processedWebhookIds.delete(id);
  }
  if (processedWebhookIds.has(webhookId)) return true;
  processedWebhookIds.set(webhookId, now);
  return false;
}

// ── Discount variant revert ──────────────────────────────────────────────────

/**
 * After a discounted subscription payment succeeds, switch the subscription back
 * to the normal variant and mark the discount as used.
 *
 * Uses the normalized user_discounts table (SC3). Every write is a single atomic
 * UPDATE — no read-modify-write cycles, no optimistic locking retries.
 */
async function revertDiscountedVariantIfNeeded(userId: string, providerSubscriptionId: string): Promise<void> {
  const {
    getPendingRevertBySubscription,
    incrementRevertAttempts,
    markDiscountUsed,
  } = await import('@/lib/server/discounts');

  const pending = await getPendingRevertBySubscription(userId, providerSubscriptionId);
  if (!pending) return;
  if (!pending.revertNormalVariantId) return; // Defensive: shouldn't happen

  if (pending.revertAttempts >= 3) {
    console.warn(
      `[billing/webhook] revertDiscountedVariant max_attempts_reached userId=${userId} — page-load safety check will handle`,
    );
    return;
  }

  // Increment attempts counter BEFORE API call so a permanent failure eventually caps out.
  await incrementRevertAttempts(pending.id);

  // Now attempt the API call
  try {
    const provider = getPaymentProvider();
    await provider.switchSubscriptionVariant(providerSubscriptionId, pending.revertNormalVariantId);
    console.log(
      `[billing/webhook] reverted_discount_variant userId=${userId} from=${pending.revertDiscountedVariantId} to=${pending.revertNormalVariantId}`,
    );

    // Success: atomic update — clear revert columns + set used=true
    await markDiscountUsed(pending.id);
  } catch (err) {
    console.error(
      `[billing/webhook] revertDiscountedVariant failed userId=${userId} attempt=${pending.revertAttempts + 1}`,
      err,
    );
    // Incremented attempts already written — webhook will retry on next payment event
  }
}

// ── Webhook action processor ─────────────────────────────────────────────────

type ProviderName = 'polar' | 'stripe' | 'paddle' | 'lemonsqueezy';

export async function processWebhookAction(
  action: WebhookAction,
  providerName: ProviderName
): Promise<void> {
  const supabase = createServiceRoleClient();
  // The generated @/types/supabase types don't include user_addons yet
  // (same situation as social_profiles). Cast locally until types are
  // regenerated via `npx supabase gen types`. Matches the existing idiom at
  // webhook-handler.ts line ~273 and subscription.ts line ~134.
  const supabaseAddons = supabase as unknown as Record<string, (table: string) => unknown> & {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (c: string, v: unknown) => {
          eq: (c: string, v: unknown) => {
            maybeSingle: () => Promise<{
              data: { provider: string | null; provider_subscription_id: string | null } | null;
              error: unknown;
            }>;
          };
        };
      };
      upsert: (
        values: Record<string, unknown>,
        options: { onConflict: string },
      ) => Promise<{ error: { message: string } | null }>;
      update: (values: Record<string, unknown>) => {
        eq: (c: string, v: unknown) => Promise<{ error: { message: string } | null }> & {
          eq: (c: string, v: unknown) => Promise<{ error: { message: string } | null }>;
          select: (cols: string) => {
            limit: (n: number) => Promise<{
              data: { user_id: string }[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  };

  switch (action.type) {
    case 'subscription.updated': {
      let resolvedUserId = action.userId;
      if (!resolvedUserId) {
        const email = action.data.customerEmail ?? await (async () => {
          try {
            return await getPaymentProvider().getCustomerEmail(action.data.providerCustomerId);
          } catch {
            return null;
          }
        })();
        if (!email) {
          console.log(
            `[billing/webhook] action=subscription.updated missing_customer_email customerId=${action.data.providerCustomerId}`
          );
        } else {
          console.log(`[billing/webhook] action=subscription.updated resolving_customer customerId=${action.data.providerCustomerId}`);
        }

        const emailMatchedUserId = email ? await ensureUserForCheckoutEmail(email, providerName) : null;
        if (email && !emailMatchedUserId) {
          console.log(
            `[billing/webhook] action=subscription.updated ignored reason=failed_to_create_or_match_user customerId=${action.data.providerCustomerId}`
          );
          break;
        }
        resolvedUserId = emailMatchedUserId ?? null;
      }

      if (!resolvedUserId) {
        console.log(
          `[billing/webhook] action=subscription.updated ignored reason=no_user_resolution customerId=${action.data.providerCustomerId}`
        );
        break;
      }

      console.log(`[billing/webhook] action=subscription.updated resolved_userId=${resolvedUserId}`);

      const { data: existing } = await supabase
        .from('subscriptions')
        .select('provider')
        .eq('user_id', resolvedUserId)
        .maybeSingle();

      if (existing?.provider === 'admin') {
        console.log(`[billing/webhook] Skipping upsert — admin grant protected for userId=${resolvedUserId}`);
        break;
      }

      const { error } = await supabase.from('subscriptions').upsert(
        {
          user_id: resolvedUserId,
          tier: action.data.tierId,
          status: action.data.status,
          billing_period: action.data.billingPeriod,
          provider: providerName,
          provider_subscription_id: action.data.providerSubscriptionId,
          provider_customer_id: action.data.providerCustomerId,
          current_period_start: action.data.periodStart.toISOString(),
          current_period_end: action.data.periodEnd.toISOString(),
          cancel_at_period_end: action.data.cancelAtPeriodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) console.error('[billing/webhook] upsert error:', error.message);

      // Apply price data cached from the preceding order.created event.
      const pending = action.data.providerCustomerId
        ? consumePendingPrice(action.data.providerCustomerId)
        : null;
      if (pending) {
        const { error: priceError } = await supabase
          .from('subscriptions')
          .update({
            price_amount: pending.amountCents,
            tax_amount: pending.taxCents,
            currency: pending.currency,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', resolvedUserId);
        if (priceError) console.error('[billing/webhook] price update error:', priceError.message);
        else console.log(`[billing/webhook] applied pending price userId=${resolvedUserId} amount=${pending.amountCents} currency=${pending.currency}`);
      }

      const isActive = ['active', 'trialing', 'admin_granted', 'past_due'].includes(action.data.status);
      const syncedTier = isActive ? action.data.tierId : 'starter';
      await (supabase as ReturnType<typeof createServiceRoleClient> & { from: (table: string) => any })
        .from('social_profiles')
        .update({ tier: syncedTier, updated_at: new Date().toISOString() })
        .eq('user_id', resolvedUserId);

      // On payment success: check if we need to revert a discounted variant back to normal
      if (action.originalEvent === 'subscription_payment_success') {
        await revertDiscountedVariantIfNeeded(resolvedUserId, action.data.providerSubscriptionId);
      }
      break;
    }

    case 'addon.updated': {
      // AUD-3: validate payload at trust boundary. LS signs the request via
      // HMAC (parseWebhookEvent), but the parser can't guarantee the DB payload
      // is clean — do it here before we write to user_addons.
      const addon = action.data;
      const VALID_ADDON_IDS = new Set(['starter_plus']);
      const VALID_STATUSES = new Set(['active', 'trialing', 'past_due', 'canceled']);
      const fiveYearsMs = 5 * 365 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (
        !VALID_ADDON_IDS.has(addon.addonId) ||
        !VALID_STATUSES.has(addon.status) ||
        !addon.providerSubscriptionId ||
        !(addon.periodEnd instanceof Date) ||
        Math.abs(addon.periodEnd.getTime() - now) > fiveYearsMs
      ) {
        console.error(
          `[billing/addon] invalid_payload addonId=${addon.addonId} status=${addon.status} providerSubscriptionId=${addon.providerSubscriptionId}`,
        );
        break;
      }

      let resolvedUserId = action.userId;
      if (!resolvedUserId) {
        const email = addon.customerEmail ?? await (async () => {
          try {
            return await getPaymentProvider().getCustomerEmail(addon.providerCustomerId);
          } catch {
            return null;
          }
        })();
        const emailMatchedUserId = email ? await ensureUserForCheckoutEmail(email, providerName) : null;
        resolvedUserId = emailMatchedUserId ?? null;
      }

      if (!resolvedUserId) {
        console.log(
          `[billing/addon] ignored reason=no_user_resolution customerId=${addon.providerCustomerId}`,
        );
        break;
      }

      // ER-2: admin-grant protection. If an admin has manually granted this
      // add-on, do not let a real LS webhook clobber that row.
      const { data: existingAddon } = await supabaseAddons
        .from('user_addons')
        .select('provider, provider_subscription_id')
        .eq('user_id', resolvedUserId)
        .eq('addon_type', addon.addonId)
        .maybeSingle();

      if (existingAddon?.provider === 'admin') {
        console.log(
          `[billing/addon] skip_upsert reason=admin_grant_protected userId=${resolvedUserId}`,
        );
        break;
      }

      // ER-6: orphan warning. If we already have a row with a DIFFERENT
      // provider_subscription_id, an anonymous user may have checked out twice.
      // Log for manual follow-up (the upsert below will replace the older row).
      if (
        existingAddon?.provider_subscription_id &&
        existingAddon.provider_subscription_id !== addon.providerSubscriptionId
      ) {
        console.warn(
          `[billing/addon] orphan_ls_subscription userId=${resolvedUserId} existing=${existingAddon.provider_subscription_id} incoming=${addon.providerSubscriptionId}`,
        );
      }

      const { error: upsertError } = await supabaseAddons.from('user_addons').upsert(
        {
          user_id: resolvedUserId,
          addon_type: addon.addonId,
          status: addon.status,
          provider: providerName,
          provider_subscription_id: addon.providerSubscriptionId,
          provider_customer_id: addon.providerCustomerId,
          current_period_start: addon.periodStart.toISOString(),
          current_period_end: addon.periodEnd.toISOString(),
          cancel_at_period_end: addon.cancelAtPeriodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,addon_type' },
      );
      if (upsertError) {
        console.error('[billing/addon] upsert error:', upsertError.message);
        break;
      }

      // Apply any price cached by the preceding order.created event (same
      // pattern as subscription.updated).
      const pendingAddon = addon.providerCustomerId
        ? consumePendingPrice(addon.providerCustomerId)
        : null;
      if (pendingAddon) {
        const { error: priceError } = await supabaseAddons
          .from('user_addons')
          .update({
            price_amount: pendingAddon.amountCents,
            tax_amount: pendingAddon.taxCents,
            currency: pendingAddon.currency,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', resolvedUserId)
          .eq('addon_type', addon.addonId);
        if (priceError) {
          console.error('[billing/addon] price update error:', priceError.message);
        } else {
          console.log(
            `[billing/addon] applied pending price userId=${resolvedUserId} amount=${pendingAddon.amountCents} currency=${pendingAddon.currency}`,
          );
        }
      }

      console.log(
        `[billing/addon] upserted userId=${resolvedUserId} providerSubscriptionId=${addon.providerSubscriptionId} status=${addon.status}`,
      );
      break;
    }

    case 'subscription.canceled': {
      const updatePayload = {
        cancel_at_period_end: action.cancelAtPeriodEnd,
        current_period_end: action.periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
        ...(!action.cancelAtPeriodEnd ? { status: 'canceled' as const } : {}),
      };
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updatePayload)
        .eq('provider_subscription_id', action.providerSubscriptionId)
        .select('user_id')
        .limit(1);
      if (error) {
        console.error('[billing/webhook] subscription.canceled error:', error.message);
        break;
      }
      if ((data?.length ?? 0) === 0 && action.providerCustomerId) {
        const { error: fallbackError } = await supabase
          .from('subscriptions')
          .update(updatePayload)
          .eq('provider_customer_id', action.providerCustomerId);
        if (fallbackError) {
          console.error('[billing/webhook] subscription.canceled fallback error:', fallbackError.message);
        } else {
          console.log(
            `[billing/webhook] subscription.canceled matched by provider_customer_id customerId=${action.providerCustomerId}`
          );
        }
      }

      // Also attempt to match the cancel against user_addons by
      // provider_subscription_id. LS IDs are globally unique, so at most one
      // row across both tables will match. No-op if this cancel belongs to a
      // tier subscription.
      const { data: addonData, error: addonError } = await supabaseAddons
        .from('user_addons')
        .update(updatePayload)
        .eq('provider_subscription_id', action.providerSubscriptionId)
        .select('user_id')
        .limit(1);
      if (addonError) {
        console.error('[billing/addon] webhook_canceled error:', addonError.message);
      } else if ((addonData?.length ?? 0) > 0) {
        console.log(
          `[billing/addon] webhook_canceled providerSubscriptionId=${action.providerSubscriptionId}`,
        );
      }
      break;
    }

    case 'subscription.revoke': {
      const updatePayload = { status: 'canceled' as const, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updatePayload)
        .eq('provider_subscription_id', action.providerSubscriptionId)
        .select('user_id')
        .limit(1);
      if (error) {
        console.error('[billing/webhook] revoke error:', error.message);
        break;
      }
      if ((data?.length ?? 0) === 0 && action.providerCustomerId) {
        const { error: fallbackError } = await supabase
          .from('subscriptions')
          .update(updatePayload)
          .eq('provider_customer_id', action.providerCustomerId);
        if (fallbackError) {
          console.error('[billing/webhook] revoke fallback error:', fallbackError.message);
        } else {
          console.log(
            `[billing/webhook] revoke matched by provider_customer_id customerId=${action.providerCustomerId}`
          );
        }
      }

      // Mirror the revoke against user_addons — see the canceled branch above.
      const { data: addonData, error: addonError } = await supabaseAddons
        .from('user_addons')
        .update(updatePayload)
        .eq('provider_subscription_id', action.providerSubscriptionId)
        .select('user_id')
        .limit(1);
      if (addonError) {
        console.error('[billing/addon] webhook_revoked error:', addonError.message);
      } else if ((addonData?.length ?? 0) > 0) {
        console.log(
          `[billing/addon] webhook_revoked providerSubscriptionId=${action.providerSubscriptionId}`,
        );
      }
      break;
    }

    case 'order.created': {
      console.log(`[billing/webhook] order.created orderId=${action.orderId} amount=$${action.amountUsd} userId=${action.userId ?? '—'} customerId=${action.providerCustomerId ?? '—'}`);
      const supabaseOrder = createServiceRoleClient();

      // Cache price data so subscription.updated can apply it after the
      // subscription row is created (order_created fires before subscription_created).
      if (action.providerCustomerId) {
        storePendingPrice(action.providerCustomerId, {
          amountCents: action.amountCents,
          taxCents: action.taxCents,
          currency: action.currency,
        });
      }

      if (action.subscription) {
        const sub = action.subscription;

        let resolvedUserId = action.userId;
        if (!resolvedUserId) {
          const email = sub.customerEmail;
          resolvedUserId = email ? await findUserIdByEmail(email) : null;
        }
        if (!resolvedUserId) {
          console.log(`[billing/webhook] order.created ignored reason=no_user_resolution orderId=${action.orderId}`);
          break;
        }

        const { data: existing } = await supabaseOrder
          .from('subscriptions')
          .select('provider')
          .eq('user_id', resolvedUserId)
          .maybeSingle();

        if (existing?.provider === 'admin') {
          console.log(`[billing/webhook] order.created skipping upsert — admin grant protected userId=${resolvedUserId}`);
          break;
        }

        const { error } = await supabaseOrder.from('subscriptions').upsert(
          {
            user_id: resolvedUserId,
            tier: sub.tierId,
            status: sub.status,
            billing_period: sub.billingPeriod,
            provider: providerName,
            provider_subscription_id: sub.providerSubscriptionId,
            provider_customer_id: sub.providerCustomerId,
            current_period_start: sub.periodStart.toISOString(),
            current_period_end: sub.periodEnd.toISOString(),
            cancel_at_period_end: sub.cancelAtPeriodEnd,
            price_amount: action.amountCents,
            tax_amount: action.taxCents,
            currency: action.currency,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        if (error) console.error('[billing/webhook] order.created upsert error:', error.message);
      } else {
        const pricePayload = {
          price_amount: action.amountCents,
          tax_amount: action.taxCents,
          currency: action.currency,
          updated_at: new Date().toISOString(),
        };
        if (action.userId) {
          await supabaseOrder.from('subscriptions').update(pricePayload).eq('user_id', action.userId);
        } else if (action.providerCustomerId) {
          await supabaseOrder.from('subscriptions').update(pricePayload).eq('provider_customer_id', action.providerCustomerId);
        }
      }
      break;
    }

    case 'ignore':
      break;
  }
}
