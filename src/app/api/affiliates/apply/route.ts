import { NextRequest, NextResponse } from 'next/server';
import { sanitizeForDiscord } from '@/utils/sanitize';
import { getCachedUserSession } from '@/lib/server/session';

// In-memory rate limiter (per IP, 1 submission per 30s).
// Scoped separately from the contact route so the two surfaces don't share a budget.
const rateLimitMap = new Map<string, number>();

function checkApplyRateLimit(ip: string): boolean {
  const now = Date.now();

  // TTL cleanup: remove entries older than 60s
  for (const [key, timestamp] of rateLimitMap) {
    if (now - timestamp > 60_000) rateLimitMap.delete(key);
  }

  const lastSubmit = rateLimitMap.get(ip);
  if (lastSubmit && now - lastSubmit < 30_000) return false;

  rateLimitMap.set(ip, now);
  return true;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, website, audience, website2 } = body as {
    name?: string;
    website?: string;
    audience?: string;
    website2?: string;
  };

  // Honeypot check: bots fill the hidden "website2" field
  if (website2) {
    return NextResponse.json({ success: true });
  }

  // Require an authenticated session. The email is read from the session below
  // (not from the request body) so an applicant cannot apply on someone else's
  // behalf by tampering with the payload.
  const { user } = await getCachedUserSession();
  if (!user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Rate limiting — checked after the session read so unauthenticated callers
  // can't exhaust the budget with anonymous traffic.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  if (!checkApplyRateLimit(ip)) {
    console.error('[affiliates-apply] rate_limited ip=' + ip);
    return NextResponse.json(
      { error: 'Please wait before sending another application' },
      { status: 429 }
    );
  }

  // Validation
  const errors: Record<string, string> = {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Name is required';
  } else if (name.length > 100) {
    errors.name = 'Name must be 100 characters or less';
  }

  if (website && typeof website === 'string' && website.length > 200) {
    errors.website = 'URL must be 200 characters or less';
  }

  if (!audience || typeof audience !== 'string' || audience.trim().length === 0) {
    errors.audience = 'Tell us a bit about your audience';
  } else if (audience.trim().length < 50) {
    errors.audience = 'Please write at least 50 characters';
  } else if (audience.length > 1000) {
    errors.audience = 'Must be 1000 characters or less';
  }

  if (Object.keys(errors).length > 0) {
    console.error(
      `[affiliates-apply] validation_failed ip=${ip} fields=${Object.keys(errors).join(',')}`
    );
    return NextResponse.json({ errors }, { status: 400 });
  }

  // The email displayed in the form is read-only, but we rely on the session value
  // as the source of truth (defense in depth against payload tampering).
  const email = user.email;

  // Resolve Discord webhook configuration.
  // Prefer the dedicated affiliates channel so the applications don't get buried
  // in the shared contact-form channel. Fall back to the shared webhook if unset.
  const webhookUrl =
    process.env.AFFILIATES_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  const mentionRoleId = process.env.AFFILIATES_DISCORD_MENTION_ROLE_ID;

  if (!webhookUrl) {
    console.error('[affiliates-apply] webhook_missing');
    // Tarpit: still return success so we do not leak config state to probes.
    return NextResponse.json({ success: true });
  }

  // Sanitize every user-controlled field before embedding in Discord.
  // sanitizeForDiscord neutralizes @everyone/@here and user/channel/role mentions.
  // `name` and `audience` are proven non-empty strings by the validation block above,
  // but TS can't narrow destructured optionals across branches — assert here.
  const safeName = sanitizeForDiscord((name as string).trim());
  const safeEmail = sanitizeForDiscord(email);
  const safeWebsite = website ? sanitizeForDiscord(website.trim()) : '—';
  const safeAudience = sanitizeForDiscord((audience as string).trim());

  // Embed is capped at 4096 characters — affiliate audience is capped at 1000 so
  // we are comfortably under, but guard anyway to avoid Discord 400s on future changes.
  const truncatedAudience =
    safeAudience.length > 4000 ? safeAudience.slice(0, 3994) + '… (truncated)' : safeAudience;

  // Also sanitize the user id to prevent any future free-text fields from breaking the embed
  // (user.id is a UUID today, but treat all server-side-provided strings consistently).
  const safeUserId = sanitizeForDiscord(user.id);

  // Optional role mention, rendered in the message content (embeds do not ping roles).
  const content =
    mentionRoleId && /^\d+$/.test(mentionRoleId)
      ? `<@&${mentionRoleId}> New affiliate application`
      : undefined;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        // Restrict which mentions are allowed to actually ping, so an unexpected
        // user-controlled string can never trigger a mass-ping even if sanitize
        // misses something.
        allowed_mentions: mentionRoleId
          ? { parse: [], roles: [mentionRoleId] }
          : { parse: [] },
        embeds: [
          {
            title: 'New Affiliate Application',
            description: truncatedAudience,
            color: 15844367, // amber
            fields: [
              { name: 'Name', value: safeName, inline: true },
              { name: 'Email', value: safeEmail, inline: true },
              { name: 'User ID', value: safeUserId, inline: false },
              { name: 'Channel / Website', value: safeWebsite, inline: false },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'AlphaStats Affiliates' },
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error(
        `[affiliates-apply] webhook_failed status=${res.status}`,
        await res.text().catch(() => '')
      );
      // Still return success to the user — the payload is captured in server logs
      // so an operator can replay it manually.
    } else {
      console.log(
        `[affiliates-apply] submitted user_id=${user.id} ip=${ip} webhook_ok=true`
      );
    }
  } catch (err) {
    console.error('[affiliates-apply] webhook_error', err);
    // Tarpit on error too — successful UX with audit trail in logs.
  }

  return NextResponse.json({ success: true });
}
