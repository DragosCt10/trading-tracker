# TODOs — deferred until app makes money

## 1. Upgrade Supabase plan → pgBouncer connection pooling

**Why:** k6 load test (30k trades, 5 VUs) shows p95 = ~4s on staging. The median is healthy
(~1.9s) but tail-latency spikes are caused by Supabase's hobby-tier shared connection pool
exhausting under concurrent load. pgBouncer (available on paid plans) handles connection
multiplexing and cuts tail latency by 50–70%, which should bring p95 below the 2s target.

**When unblocked:** switch to Pro plan → enable pgBouncer in Supabase dashboard → re-run
`k6 run tests/load/scenarios/stats-dashboard.js` to verify p95 < 2000ms.

## 4. Normalize discounts to a user_discounts table (SC3)

**What:** Move discount state from `feature_flags` JSONB into a dedicated `user_discounts` table with proper columns (`user_id`, `discount_id`, `coupon_code`, `expires_at`, `used_at`, etc.).

**Why:** Querying "all users with expiring coupons", "all unused discounts older than 60 days", or running discount analytics requires JSONB extraction across all rows — expensive and hard to index.

**When unblocked:** When running batch discount operations or analytics queries. The JSONB approach works at current scale. Migration would require updating all callers: `redeemMilestoneDiscount`, `redeemProRetentionDiscount`, `redeemActivityDiscount`, `applyDiscountToSubscription`, `revertDiscountedVariantIfNeeded`, `checkTradeMilestones`.

**Depends on:** Nothing — but run after SC2 to avoid double-migrating the schema.

