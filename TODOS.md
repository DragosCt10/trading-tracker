# TODOs — deferred until app makes money

## 1. Replace in-memory invite rate limiter with Redis/Upstash

**Why:** `checkRateLimit` in `src/lib/rateLimit.ts` uses a `Map` stored in process memory.
The limit (10 redemption attempts/min per user) resets on every cold start or dyno restart,
meaning a determined attacker could bypass it by hammering during deployment windows or on
serverless platforms that spin up fresh instances per request. Fine for current single-instance
usage, but becomes a gap at scale or if the app moves to Vercel Edge / multi-region.

**When unblocked:** swap `checkRateLimit` for an Upstash Redis rate limiter (or similar
edge-compatible KV store). The call site in `redeemChannelInvite` is a single line —
the swap is ~30 min of work once a Redis instance is provisioned.

---

## 2. Upgrade Supabase plan → pgBouncer connection pooling

**Why:** k6 load test (30k trades, 5 VUs) shows p95 = ~4s on staging. The median is healthy
(~1.9s) but tail-latency spikes are caused by Supabase's hobby-tier shared connection pool
exhausting under concurrent load. pgBouncer (available on paid plans) handles connection
multiplexing and cuts tail latency by 50–70%, which should bring p95 below the 2s target.

**When unblocked:** switch to Pro plan → enable pgBouncer in Supabase dashboard → re-run
`k6 run tests/load/scenarios/stats-dashboard.js` to verify p95 < 2000ms.
