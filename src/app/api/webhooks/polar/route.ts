import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { getPaymentProvider } from '@/lib/billing';
import { ensureDefaultAccountForUserId } from '@/lib/server/accounts';

export const runtime = 'nodejs';

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
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
  const temporaryPassword = crypto.randomUUID();
  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: temporaryPassword,
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

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${getAppUrl()}/update-password`,
  });
  if (resetError) {
    console.error(`[billing/webhook] resetPasswordForEmail failed email=${normalizedEmail}`, resetError);
  }

  console.log(`[billing/webhook] created_user_from_polar email=${normalizedEmail} userId=${newUserId}`);
  return newUserId;
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

  // Collect all webhook headers needed for signature validation
  const webhookHeaders: Record<string, string> = {
    'webhook-id': req.headers.get('webhook-id') ?? '',
    'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
    'webhook-signature': req.headers.get('webhook-signature') ?? '',
  };

  let provider;
  try {
    provider = getPaymentProvider();
  } catch {
    // Billing env not fully configured (e.g. development without Polar)
    return NextResponse.json({ received: true });
  }

  let action;
  try {
    action = await provider.parseWebhookEvent({ rawBody, headers: webhookHeaders, secret });
  } catch (err) {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    console.error(`[billing/webhook] Invalid HMAC signature — ip=${ip} timestamp=${new Date().toISOString()}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  switch (action.type) {
    case 'subscription.upsert': {
      const email = await provider.getCustomerEmail(action.data.providerCustomerId);
      if (!email) {
        console.log(
          `[billing/webhook] action=subscription.upsert missing_customer_email customerId=${action.data.providerCustomerId}`
        );
      } else {
        console.log(`[billing/webhook] action=subscription.upsert customer_email=${email}`);
      }

      const emailMatchedUserId = email ? await ensureUserForPolarEmail(email) : null;
      if (email && !emailMatchedUserId) {
        console.log(
          `[billing/webhook] action=subscription.upsert ignored reason=failed_to_create_or_match_user email=${email} customerId=${action.data.providerCustomerId}`
        );
        break;
      }

      const resolvedUserId = emailMatchedUserId ?? action.userId;
      if (!resolvedUserId) {
        console.log(
          `[billing/webhook] action=subscription.upsert ignored reason=no_user_resolution customerId=${action.data.providerCustomerId}`
        );
        break;
      }

      console.log(`[billing/webhook] action=subscription.upsert resolved_userId=${resolvedUserId}`);

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

    case 'subscription.cancel_at_period_end': {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          current_period_end: action.periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('provider_subscription_id', action.providerSubscriptionId);
      if (error) console.error('[billing/webhook] cancel_at_period_end error:', error.message);
      break;
    }

    case 'subscription.revoke': {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('provider_subscription_id', action.providerSubscriptionId);
      if (error) console.error('[billing/webhook] revoke error:', error.message);
      break;
    }

    case 'order.created': {
      // Log revenue event — future: insert into payments_log table
      console.log(`[billing/webhook] order.created orderId=${action.orderId} amount=$${action.amountUsd} userId=${action.userId}`);
      break;
    }

    case 'ignore':
      break;
  }

  return NextResponse.json({ received: true });
}
