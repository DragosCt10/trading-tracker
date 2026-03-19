import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { getPaymentProvider } from '@/lib/billing';

export const runtime = 'nodejs';

async function findUserIdByEmail(email: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error(`[billing/webhook] auth lookup failed email=${normalizedEmail}`, error);
    return null;
  }

  const user = data?.users?.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
  return user?.id ?? null;
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
      let resolvedUserId = action.userId;

      if (!resolvedUserId) {
        const email = await provider.getCustomerEmail(action.data.providerCustomerId);
        if (!email) {
          console.log(
            `[billing/webhook] action=subscription.upsert ignored reason=missing_email customerId=${action.data.providerCustomerId}`
          );
          break;
        }

        console.log(`[billing/webhook] action=subscription.upsert customer_email=${email}`);
        resolvedUserId = await findUserIdByEmail(email);
      }

      if (!resolvedUserId) {
        console.log(
          `[billing/webhook] action=subscription.upsert ignored reason=no_matching_user customerId=${action.data.providerCustomerId}`
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
