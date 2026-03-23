#!/bin/bash
# ============================================================
# lighthouse-stats.sh — Lighthouse Performance Audit for Stats Routes
# ============================================================
# Runs Lighthouse against all strategy stats routes and saves HTML reports.
# Measures LCP, TBT, CLS, and overall performance score.
#
# Prerequisites:
#   npm install -g lighthouse   (or use npx lighthouse)
#   Dev server running: npm run dev
#   Seed run: psql $DATABASE_URL < tests/load/seed/seed-perf-trades.sql
#   User logged in with browser cookies (use /setup-browser-cookies or
#   set PERF_COOKIE below manually from browser DevTools)
#
# Usage:
#   ./tests/frontend/lighthouse-stats.sh
#   BASE_URL=https://preview.vercel.app ./tests/frontend/lighthouse-stats.sh
#
# For authoritative scores use a staging URL — localhost scores are
# typically 20-40 points higher than production (no network latency,
# no cold starts, no CDN). See lighthouse-feed.sh for the same note.
#
# Output: HTML + JSON reports in tests/frontend/reports/
# ============================================================

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
PERF_STRATEGY_SLUG_4999="${PERF_STRATEGY_SLUG_4999:-perf-test-4999}"
PERF_STRATEGY_SLUG_5001="${PERF_STRATEGY_SLUG_5001:-perf-test-5001}"
PERF_STRATEGY_SLUG_30K="${PERF_STRATEGY_SLUG_30K:-perf-test-30k}"

DATE=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="tests/frontend/reports"
LIGHTHOUSE_FLAGS="--output html,json --only-categories performance --quiet"

mkdir -p "$REPORT_DIR"

echo "==================================================="
echo "Stats Lighthouse Audit"
echo "Base URL: $BASE_URL"
echo "Timestamp: $DATE"
echo "Reports: $REPORT_DIR/"
echo ""
echo "NOTE: Run seed-perf-trades.sql first if slugs don't resolve."
echo "==================================================="

# Helper: run lighthouse and extract key metrics from JSON
run_lighthouse() {
  local url="$1"
  local name="$2"
  local html_path="$REPORT_DIR/${name}-${DATE}.html"
  local json_path="$REPORT_DIR/${name}-${DATE}.json"

  echo ""
  echo "→ Auditing: $url"
  echo "  Report: $html_path"

  if command -v lighthouse &>/dev/null; then
    lighthouse "$url" $LIGHTHOUSE_FLAGS \
      --output-path "$REPORT_DIR/${name}-${DATE}" \
      2>/dev/null || npx lighthouse "$url" $LIGHTHOUSE_FLAGS \
      --output-path "$REPORT_DIR/${name}-${DATE}"
  else
    npx lighthouse "$url" $LIGHTHOUSE_FLAGS \
      --output-path "$REPORT_DIR/${name}-${DATE}"
  fi

  # Extract metrics from JSON report
  if [ -f "$json_path" ]; then
    local score lcp tbt cls fcp
    score=$(jq -r '.categories.performance.score * 100 | floor' "$json_path" 2>/dev/null || echo "N/A")
    lcp=$(jq -r '.audits["largest-contentful-paint"].displayValue' "$json_path" 2>/dev/null || echo "N/A")
    tbt=$(jq -r '.audits["total-blocking-time"].displayValue' "$json_path" 2>/dev/null || echo "N/A")
    cls=$(jq -r '.audits["cumulative-layout-shift"].displayValue' "$json_path" 2>/dev/null || echo "N/A")
    fcp=$(jq -r '.audits["first-contentful-paint"].displayValue' "$json_path" 2>/dev/null || echo "N/A")

    echo "  ┌────────────────────────────────────────"
    echo "  │ Score: ${score}/100"
    echo "  │ LCP:   ${lcp}"
    echo "  │ TBT:   ${tbt}"
    echo "  │ CLS:   ${cls}"
    echo "  │ FCP:   ${fcp}"
    echo "  └────────────────────────────────────────"
  fi
}

# ── Routes under test ────────────────────────────────────────────────────
echo ""
echo "── Strategy C: 30,000 trades (primary load test) ──────────────────"
run_lighthouse \
  "${BASE_URL}/strategy/${PERF_STRATEGY_SLUG_30K}" \
  "stats-main-30k"

run_lighthouse \
  "${BASE_URL}/strategy/${PERF_STRATEGY_SLUG_30K}/my-trades" \
  "stats-my-trades-30k"

run_lighthouse \
  "${BASE_URL}/strategy/${PERF_STRATEGY_SLUG_30K}/custom-stats" \
  "stats-custom-30k"

run_lighthouse \
  "${BASE_URL}/strategy/${PERF_STRATEGY_SLUG_30K}/daily-journal" \
  "stats-daily-journal-30k"

echo ""
echo "── Strategy A: 4,999 trades (cache-fast path) ─────────────────────"
run_lighthouse \
  "${BASE_URL}/strategy/${PERF_STRATEGY_SLUG_4999}" \
  "stats-main-4999"

echo ""
echo "── Strategy B: 5,001 trades (RPC path, ≤5k cliff) ─────────────────"
run_lighthouse \
  "${BASE_URL}/strategy/${PERF_STRATEGY_SLUG_5001}" \
  "stats-main-5001"

# ── Summary ─────────────────────────────────────────────────────────────
echo ""
echo "==================================================="
echo "All reports saved to: $REPORT_DIR/"
echo ""
echo "Key thresholds:"
echo "  LCP (30k)   → target < 3s, fail > 5s"
echo "  LCP (4,999) → target < 0.5s (cache path)"
echo "  LCP (5,001) → target < 2s (RPC path)"
echo "  TBT         → target < 300ms"
echo "  CLS         → target < 0.1"
echo ""
echo "NOTE: localhost LCP will be faster than production."
echo "For authoritative scores: BASE_URL=https://staging.url ./tests/frontend/lighthouse-stats.sh"
echo "==================================================="
