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

export function isAlreadyProcessed(webhookId: string): boolean {
  const now = Date.now();
  for (const [id, ts] of Array.from(processedWebhookIds.entries())) {
    if (now - ts > IDEMPOTENCY_TTL_MS) processedWebhookIds.delete(id);
  }
  if (processedWebhookIds.has(webhookId)) return true;
  processedWebhookIds.set(webhookId, now);
  return false;
}

// ── Webhook action processor ─────────────────────────────────────────────────

type ProviderName = 'polar' | 'stripe' | 'paddle' | 'lemonsqueezy';

export async function processWebhookAction(
  action: WebhookAction,
  providerName: ProviderName
): Promise<void> {
  const supabase = createServiceRoleClient();

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

      const isActive = ['active', 'trialing', 'admin_granted', 'past_due'].includes(action.data.status);
      const syncedTier = isActive ? action.data.tierId : 'starter';
      await (supabase as ReturnType<typeof createServiceRoleClient> & { from: (table: string) => any })
        .from('social_profiles')
        .update({ tier: syncedTier, updated_at: new Date().toISOString() })
        .eq('user_id', resolvedUserId);
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
      break;
    }

    case 'order.created': {
      console.log(`[billing/webhook] order.created orderId=${action.orderId} amount=$${action.amountUsd} userId=${action.userId ?? '—'} customerId=${action.providerCustomerId ?? '—'}`);
      const supabaseOrder = createServiceRoleClient();

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
