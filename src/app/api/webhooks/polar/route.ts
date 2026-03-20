import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { getPaymentProvider } from '@/lib/billing';
import { ensureDefaultAccountForUserId } from '@/lib/server/accounts';

export const runtime = 'nodejs';

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

// O(1) lookup via direct auth.users query instead of paginating all users.
async function findUserIdByEmail(email: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  // Use rpc to query auth.users directly — requires a DB function `get_user_id_by_email`.
  // Falls back to paginated admin API if RPC not available.
  try {
    const { data, error } = await (supabase as ReturnType<typeof createServiceRoleClient> & { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }).rpc('get_user_id_by_email', { p_email: normalizedEmail });
    if (!error && data) return data as string;
  } catch {
    // RPC not available, fall back to admin API
  }

  // Fallback: use Supabase admin filter (still O(n) but last resort)
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

async function ensureUserForPolarEmail(email: string): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const existingUserId = await findUserIdByEmail(normalizedEmail);
  if (existingUserId) return existingUserId;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
    user_metadata: { source: 'polar_checkout' },
  });

  if (error) {
    console.error(`[billing/webhook] createUser failed email=${normalizedEmail}`, error);
    // Handle possible race where user was created concurrently.
    return findUserIdByEmail(normalizedEmail);
  }

  const newUserId = data.user?.id ?? null;
  if (!newUserId) return null;

  await ensureDefaultAccountForUserId(newUserId);

  // Send a magic link so the user can log in immediately — no password setup required.
  // Must use anon key client; service role bypasses Supabase's email sending for OTP.
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

  console.log(`[billing/webhook] created_user_from_polar email=${normalizedEmail} userId=${newUserId}`);
  return newUserId;
}

// Simple in-memory idempotency guard — prevents double-processing Polar retries.
const processedWebhookIds = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

function isAlreadyProcessed(webhookId: string): boolean {
  const now = Date.now();
  // Clean stale entries
  for (const [id, ts] of Array.from(processedWebhookIds.entries())) {
    if (now - ts > IDEMPOTENCY_TTL_MS) processedWebhookIds.delete(id);
  }
  if (processedWebhookIds.has(webhookId)) return true;
  processedWebhookIds.set(webhookId, now);
  return false;
}

async function processWebhookAction(action: Awaited<ReturnType<ReturnType<typeof getPaymentProvider>['parseWebhookEvent']>>) {
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
          console.log(`[billing/webhook] action=subscription.updated customer_email=${email}`);
        }

        const emailMatchedUserId = email ? await ensureUserForPolarEmail(email) : null;
        if (email && !emailMatchedUserId) {
          console.log(
            `[billing/webhook] action=subscription.updated ignored reason=failed_to_create_or_match_user email=${email} customerId=${action.data.providerCustomerId}`
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

      // Guard: never overwrite admin-granted subscriptions with webhook data
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
          provider: 'polar',
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
        // Upsert the full subscription row — handles the race where order.created arrives
        // before subscription.updated and there is no row to UPDATE yet.
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
            provider: 'polar',
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
        // No embedded subscription — fall back to a plain UPDATE on existing row.
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const secret = process.env.POLAR_SANDBOX === 'true'
    ? process.env.POLAR_SANDBOX_WEBHOOK_SECRET ?? ''
    : process.env.POLAR_WEBHOOK_SECRET ?? '';

  if (!secret) {
    console.error('[billing/webhook] POLAR_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const webhookId = req.headers.get('webhook-id') ?? '';
  const webhookHeaders: Record<string, string> = {
    'webhook-id': webhookId,
    'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
    'webhook-signature': req.headers.get('webhook-signature') ?? '',
  };

  let provider;
  try {
    provider = getPaymentProvider();
  } catch (error) {
    console.error('[billing/webhook] provider init failed', error);
    return NextResponse.json({ error: 'Billing provider unavailable' }, { status: 503 });
  }

  let action;
  try {
    action = await provider.parseWebhookEvent({ rawBody, headers: webhookHeaders, secret });
  } catch (err) {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    console.error(`[billing/webhook] Invalid HMAC signature — ip=${ip} timestamp=${new Date().toISOString()}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Deduplicate — Polar retries on timeout; idempotency guard prevents double-processing.
  if (webhookId && isAlreadyProcessed(webhookId)) {
    console.log(`[billing/webhook] duplicate webhook-id=${webhookId} — skipping`);
    return NextResponse.json({ received: true });
  }

  // Respond to Polar immediately, then process in the background.
  // This prevents Polar from marking the webhook as failed due to slow processing.
  after(async () => {
    try {
      await processWebhookAction(action);
    } catch (err) {
      console.error('[billing/webhook] background processing error', err);
    }
  });

  return NextResponse.json({ received: true });
}
