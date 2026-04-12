import { NextRequest, NextResponse } from 'next/server';
import { sanitizeForDiscord } from '@/utils/sanitize';

const ALLOWED_SUBJECTS = [
  'General Inquiry',
  'Bug Report',
  'Feature Request',
  'Billing',
  'Partnership',
  'Affiliates',
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// In-memory rate limiter (per IP, 1 submission per 30s)
const rateLimitMap = new Map<string, number>();

function checkContactRateLimit(ip: string): boolean {
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

  const { name, email, subject, screenshotUrl, message, website } = body as {
    name: string;
    email: string;
    subject: string;
    screenshotUrl?: string;
    message: string;
    website?: string; // honeypot
  };

  // Honeypot check: bots fill the hidden "website" field
  if (website) {
    return NextResponse.json({ success: true });
  }

  // Rate limiting — checked early to reject spammers before wasting compute
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';

  if (!checkContactRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Please wait before sending another message' },
      { status: 429 },
    );
  }

  // Validation
  const errors: Record<string, string> = {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Name is required';
  } else if (name.length > 100) {
    errors.name = 'Name must be 100 characters or less';
  }

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.email = 'Email is required';
  } else if (email.length > 254) {
    errors.email = 'Email is too long';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!subject || !ALLOWED_SUBJECTS.includes(subject as typeof ALLOWED_SUBJECTS[number])) {
    errors.subject = 'Please select a valid subject';
  }

  if (subject === 'Affiliates') {
    if (!screenshotUrl || typeof screenshotUrl !== 'string' || screenshotUrl.trim().length === 0) {
      errors.screenshotUrl = 'Screenshot URL is required';
    } else if (screenshotUrl.trim().length > 2048) {
      errors.screenshotUrl = 'URL is too long';
    } else {
      try {
        const parsed = new URL(screenshotUrl.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errors.screenshotUrl = 'Please enter a valid URL (must start with http:// or https://)';
        }
      } catch {
        errors.screenshotUrl = 'Please enter a valid URL (must start with http:// or https://)';
      }
    }
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    errors.message = 'Message is required';
  } else if (message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters';
  } else if (message.length > 5000) {
    errors.message = 'Message must be 5000 characters or less';
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Send to Discord
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('[contact] DISCORD_WEBHOOK_URL not configured');
    return NextResponse.json({ success: true });
  }

  const safeName = sanitizeForDiscord(name.trim());
  const safeEmail = sanitizeForDiscord(email.trim());
  const safeSubject = sanitizeForDiscord(subject);
  const safeMessage = sanitizeForDiscord(message);
  const safeScreenshotUrl = (() => {
    if (!screenshotUrl?.trim()) return null;
    try {
      const parsed = new URL(screenshotUrl.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return sanitizeForDiscord(parsed.href);
    } catch {
      return null;
    }
  })();

  const truncatedMessage = safeMessage.length > 4096
    ? safeMessage.slice(0, 4090) + '... (truncated)'
    : safeMessage;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `New Contact: ${safeSubject}`,
          description: truncatedMessage,
          color: 5814783,
          fields: [
            { name: 'Name', value: safeName, inline: true },
            { name: 'Email', value: safeEmail, inline: true },
            { name: 'Subject', value: safeSubject, inline: true },
            ...(safeScreenshotUrl ? [{ name: 'Screenshot URL', value: safeScreenshotUrl, inline: false }] : []),
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'AlphaStats Contact Form' },
        }],
      }),
    });

    if (!res.ok) {
      console.error('[contact] Discord webhook failed:', res.status, await res.text().catch(() => ''));
      // Still return success to user — message is logged for recovery
    }
  } catch (err) {
    console.error('[contact] Discord webhook error:', err);
    // Still return success to user
  }

  return NextResponse.json({ success: true });
}
