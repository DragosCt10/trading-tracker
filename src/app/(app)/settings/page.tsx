import { redirect } from 'next/navigation';
import { getCachedUserSession } from '@/lib/server/session';
import { resolveSubscription } from '@/lib/server/subscription';
import { getCachedSocialProfile } from '@/lib/server/socialProfile';
import SettingsClient from './SettingsClient';

export type SettingsTab = 'billing' | 'account' | 'profile' | 'sharedTrades' | 'review';

/**
 * Allowlist of known feature codes that can flow through `?feature=` into the
 * Billing panel's upgrade banner. Any value not in this list is dropped at the
 * shell boundary — prevents social-engineering via crafted URLs that inject
 * attacker-controlled copy into the UI (see security audit in
 * /Users/dragos/.claude/plans/deep-greeting-snowglobe.md).
 *
 * To add a new upgrade CTA that deep-links to settings, add the feature code
 * here first. Keep values lowercase kebab-case.
 */
const KNOWN_FEATURE_CONTEXTS: ReadonlySet<string> = new Set<string>([
  // No current call sites. Extend when a real upgrade CTA is added.
]);

/** How recent a subscription update must be to trust a `?success=1` banner. */
const JUST_PAID_WINDOW_MS = 5 * 60 * 1000;

function normalizeTab(tab?: string): SettingsTab {
  if (tab === 'account') return 'account';
  if (tab === 'profile') return 'profile';
  if (tab === 'sharedTrades') return 'sharedTrades';
  if (tab === 'review') return 'review';
  return 'billing';
}

function normalizeFeatureContext(feature?: string): string | undefined {
  if (!feature) return undefined;
  return KNOWN_FEATURE_CONTEXTS.has(feature) ? feature : undefined;
}

/**
 * Whether the subscription was updated within the `justPaid` window. This is a
 * Server Component helper — it reads `Date.now()` once per request, which is
 * safe because Server Components render once per request (not reactively).
 * Defined outside the component to sidestep the `react-hooks/purity` rule,
 * which is aimed at client render functions.
 */
function isSubscriptionRecentlyUpdated(updatedAt: string | null, windowMs: number): boolean {
  if (updatedAt === null) return false;
  return Date.now() - new Date(updatedAt).getTime() < windowMs;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; success?: string; feature?: string }>;
}) {
  const [{ user }, resolvedSearch] = await Promise.all([getCachedUserSession(), searchParams]);
  if (!user) redirect('/login');

  const tab = normalizeTab(resolvedSearch.tab);

  const [subscription, socialProfile] = await Promise.all([
    resolveSubscription(user.id),
    getCachedSocialProfile(user.id),
  ]);

  // Server-verify the "Payment successful!" banner. A URL with ?success=1 alone
  // is not enough — it must match a real, recently-updated active subscription,
  // otherwise an attacker could phish users with a fake confirmation.
  const justPaid =
    resolvedSearch.success === '1' &&
    subscription.isActive &&
    isSubscriptionRecentlyUpdated(subscription.updatedAt, JUST_PAID_WINDOW_MS);

  return (
    <SettingsClient
      initialTab={tab}
      subscription={subscription}
      justPaid={justPaid}
      featureContext={normalizeFeatureContext(resolvedSearch.feature)}
      userEmail={user.email ?? ''}
      userId={user.id}
      socialProfile={socialProfile}
    />
  );
}
