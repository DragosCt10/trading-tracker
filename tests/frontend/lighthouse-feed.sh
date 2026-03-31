#!/bin/bash
# ============================================================
# lighthouse-feed.sh — Lighthouse Performance Audit for Feed Routes
# ============================================================
# Runs Lighthouse against all feed routes and saves HTML reports.
#
# BASE_URL defaults to localhost:3000 (directional scores only).
# For authoritative scores, use a staging/preview URL:
#   BASE_URL=https://your-preview.vercel.app ./tests/frontend/lighthouse-feed.sh
#
# NOTE: localhost scores are typically 20-40 points HIGHER than production
# because there's no network latency to Supabase, no cold starts, and
# no CDN. Always run against staging for authoritative numbers.
#
# Prerequisites:
#   npm install -g lighthouse   (or use npx lighthouse)
#   Dev server running: npm run dev
#   POST_ID and CHANNEL_SLUG set in env (or leave blank to skip those routes)
#
# Usage:
#   ./tests/frontend/lighthouse-feed.sh
#   BASE_URL=https://preview.vercel.app POST_ID=abc123 ./tests/frontend/lighthouse-feed.sh
#
# Output: HTML reports in tests/frontend/reports/
# ============================================================

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
POST_ID="${POST_ID:-}"
CHANNEL_SLUG="${CHANNEL_SLUG:-}"
DATE=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="tests/frontend/reports"
LIGHTHOUSE_FLAGS="--output html --only-categories performance --quiet"

mkdir -p "$REPORT_DIR"

echo "==================================================="
echo "Feed Lighthouse Audit"
echo "Base URL: $BASE_URL"
echo "Timestamp: $DATE"
echo "Reports: $REPORT_DIR/"
echo "==================================================="

# Helper: run lighthouse and capture LCP/CLS from JSON
run_lighthouse() {
  local url="$1"
  local name="$2"
  local html_path="$REPORT_DIR/${name}-${DATE}.html"
  local json_path="$REPORT_DIR/${name}-${DATE}.json"

  echo ""
  echo "→ Auditing: $url"
  echo "  Report: $html_path"

  npx lighthouse "$url" \
    $LIGHTHOUSE_FLAGS \
    --output html,json \
    --output-path "$REPORT_DIR/$name-$DATE" \
    2>/dev/null || {
      echo "  WARNING: Lighthouse failed for $url (is the server running?)"
      return
    }

  # Extract key metrics from JSON if available
  if [ -f "${json_path}" ]; then
    local lcp=$(node -e "
      const r = require('${json_path}');
      const lcp = r.audits['largest-contentful-paint'];
      console.log(lcp?.displayValue ?? 'N/A');
    " 2>/dev/null || echo "N/A")
    local cls=$(node -e "
      const r = require('${json_path}');
      const cls = r.audits['cumulative-layout-shift'];
      console.log(cls?.displayValue ?? 'N/A');
    " 2>/dev/null || echo "N/A")
    local score=$(node -e "
      const r = require('${json_path}');
      console.log(Math.round((r.categories?.performance?.score ?? 0) * 100));
    " 2>/dev/null || echo "N/A")
    local fcp=$(node -e "
      const r = require('${json_path}');
      const fcp = r.audits['first-contentful-paint'];
      console.log(fcp?.displayValue ?? 'N/A');
    " 2>/dev/null || echo "N/A")
    local tbt=$(node -e "
      const r = require('${json_path}');
      const tbt = r.audits['total-blocking-time'];
      console.log(tbt?.displayValue ?? 'N/A');
    " 2>/dev/null || echo "N/A")

    echo "  Performance score: $score/100"
    echo "  LCP: $lcp  (target: < 2.5s)"
    echo "  FCP: $fcp"
    echo "  CLS: $cls  (target: < 0.1)"
    echo "  TBT: $tbt  (target: < 200ms)"
  fi
}

# 1. Main feed page (most important — public SSR)
run_lighthouse "${BASE_URL}/feed" "feed-main"

# 2. Post detail page (second most visited route)
if [ -n "$POST_ID" ]; then
  run_lighthouse "${BASE_URL}/feed/post/${POST_ID}" "feed-post-detail"
else
  echo ""
  echo "→ Skipping post detail (set POST_ID env var to include)"
fi

# 3. Channel feed
if [ -n "$CHANNEL_SLUG" ]; then
  run_lighthouse "${BASE_URL}/feed/channel/${CHANNEL_SLUG}" "feed-channel"
else
  echo ""
  echo "→ Skipping channel feed (set CHANNEL_SLUG env var to include)"
fi

echo ""
echo "==================================================="
echo "Done. Reports saved to $REPORT_DIR/"
echo ""
echo "Key thresholds:"
echo "  LCP < 2.5s   (localhost) | < 4s (staging with throttle)"
echo "  CLS < 0.1    during scroll"
echo "  TBT < 200ms  (INP proxy)"
echo ""
echo "CLS risk areas to check manually:"
echo "  - Avatar <img> tags without width/height → causes reflow"
echo "  - PostCardSkeleton → PostCard height mismatch"
echo "  - NewPostsBanner appearing above posts"
echo ""
echo "DOM growth check (paste in browser DevTools console):"
cat << 'SNIPPET'
  // Run after each scroll page:
  console.table({
    'Total DOM nodes': document.querySelectorAll('*').length,
    'PostCard articles': document.querySelectorAll('article').length,
    'Images': document.querySelectorAll('img').length,
  });
  // Target: < 1500 total DOM nodes (Lighthouse limit)
  // Expected: exceeds limit by page 3 without virtualization
SNIPPET

echo ""
echo "INP check (paste in browser DevTools console before clicking like):"
cat << 'SNIPPET'
  new PerformanceObserver((l) => l.getEntries().forEach(e =>
    console.log(`INP: ${e.duration.toFixed(1)}ms | type: ${e.name}`)
  )).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  // Then click the like button. Target: INP < 200ms
SNIPPET

echo ""
echo "CLS measurement (paste in browser DevTools console):"
cat << 'SNIPPET'
  new PerformanceObserver((l) => l.getEntries().forEach(e => {
    if (!e.hadRecentInput)
      console.log(`CLS shift: ${e.value.toFixed(4)} | elements:`,
        e.sources?.map(s => s.node?.tagName));
  })).observe({ type: 'layout-shift', buffered: true });
  // Then scroll 10 pages. Target: cumulative CLS < 0.1
SNIPPET
echo "==================================================="
