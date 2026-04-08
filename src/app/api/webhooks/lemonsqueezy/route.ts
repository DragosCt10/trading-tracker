import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getPaymentProvider } from '@/lib/billing';
import { isAlreadyProcessed, processWebhookAction } from '@/lib/billing/webhook-handler';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? '';

  if (!secret) {
    console.error('[billing/webhook] LEMONSQUEEZY_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const signature = req.headers.get('x-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing X-Signature header' }, { status: 400 });
  }

  // Extract idempotency key from payload before full parsing
  let idempotencyKey: string;
  try {
    const parsed = JSON.parse(rawBody);
    const eventName = parsed.meta?.event_name ?? 'unknown';
    const dataId = parsed.data?.id ?? '';
    idempotencyKey = `${eventName}:${dataId}`;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const webhookHeaders: Record<string, string> = {
    'x-signature': signature,
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

  if (isAlreadyProcessed(idempotencyKey)) {
    console.log(`[billing/webhook] duplicate key=${idempotencyKey} — skipping`);
    return NextResponse.json({ received: true });
  }

  // Respond immediately, then process in the background
  after(async () => {
    try {
      await processWebhookAction(action, 'lemonsqueezy');
    } catch (err) {
      console.error('[billing/webhook] background processing error', err);
    }
  });

  return NextResponse.json({ received: true });
}
