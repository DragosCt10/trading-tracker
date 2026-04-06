# TODOs — deferred until app makes money

## 1. Upgrade Supabase plan → pgBouncer connection pooling

**Why:** k6 load test (30k trades, 5 VUs) shows p95 = ~4s on staging. The median is healthy
(~1.9s) but tail-latency spikes are caused by Supabase's hobby-tier shared connection pool
exhausting under concurrent load. pgBouncer (available on paid plans) handles connection
multiplexing and cuts tail latency by 50–70%, which should bring p95 below the 2s target.

**When unblocked:** switch to Pro plan → enable pgBouncer in Supabase dashboard → re-run
`k6 run tests/load/scenarios/stats-dashboard.js` to verify p95 < 2000ms.

