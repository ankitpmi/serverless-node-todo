#!/bin/bash
# =============================================================================
# check-canary-health.sh
#
# Monitors Lambda error rate during the canary window (10% traffic on Green).
# Called by the deploy workflow after routing 10% traffic to the new version.
#
# Exits 0  → canary is healthy, safe to shift 100% traffic to Green
# Exits 1  → canary is unhealthy, caller should rollback to Blue
#
# Usage:
#   ./scripts/check-canary-health.sh <stage> <function-name> <wait-seconds>
#
# Example:
#   ./scripts/check-canary-health.sh staging serverless-todo-app-staging-createTodo 300
# =============================================================================

set -euo pipefail

STAGE="${1}"
FUNCTION_NAME="${2}"
WAIT_SECONDS="${3:-300}"   # default: 5 minutes
REGION="ap-south-1"

# Thresholds — mirror your existing CloudWatch alarm settings
ERROR_THRESHOLD=3          # max allowed errors in the window
DURATION_THRESHOLD_MS=5000 # p95 duration limit in milliseconds

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Canary Health Check"
echo "  Stage    : $STAGE"
echo "  Function : $FUNCTION_NAME"
echo "  Window   : ${WAIT_SECONDS}s"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏳ Waiting ${WAIT_SECONDS}s for canary traffic to generate metrics..."
sleep "$WAIT_SECONDS"

# Time window: from now back by WAIT_SECONDS (plus a small buffer)
END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
START_TIME=$(date -u -d "@$(($(date +%s) - WAIT_SECONDS - 60))" +"%Y-%m-%dT%H:%M:%SZ")

echo ""
echo "📊 Querying CloudWatch metrics ($START_TIME → $END_TIME)..."

# ── 1. Error count ────────────────────────────────────────────────────────────
ERROR_COUNT=$(aws cloudwatch get-metric-statistics \
  --namespace "AWS/Lambda" \
  --metric-name "Errors" \
  --dimensions Name=FunctionName,Value="$FUNCTION_NAME" \
  --start-time "$START_TIME" \
  --end-time "$END_TIME" \
  --period "$WAIT_SECONDS" \
  --statistics Sum \
  --region "$REGION" \
  --query "Datapoints[0].Sum" \
  --output text 2>/dev/null || echo "0")

# Treat "None" (no data points) as 0
ERROR_COUNT="${ERROR_COUNT/None/0}"
ERROR_COUNT="${ERROR_COUNT/null/0}"

# ── 2. p95 Duration ───────────────────────────────────────────────────────────
P95_DURATION=$(aws cloudwatch get-metric-statistics \
  --namespace "AWS/Lambda" \
  --metric-name "Duration" \
  --dimensions Name=FunctionName,Value="$FUNCTION_NAME" \
  --start-time "$START_TIME" \
  --end-time "$END_TIME" \
  --period "$WAIT_SECONDS" \
  --extended-statistics p95 \
  --region "$REGION" \
  --query "Datapoints[0].ExtendedStatistics.p95" \
  --output text 2>/dev/null || echo "0")

P95_DURATION="${P95_DURATION/None/0}"
P95_DURATION="${P95_DURATION/null/0}"

echo ""
echo "┌─────────────────────────────────────────────────┐"
echo "│  Metric            Value        Threshold        │"
echo "│  ─────────────────────────────────────────────  │"
printf "│  Error Count       %-12s %-16s  │\n" "$ERROR_COUNT" "<= $ERROR_THRESHOLD"
printf "│  p95 Duration (ms) %-12s %-16s  │\n" "$P95_DURATION" "<= ${DURATION_THRESHOLD_MS}ms"
echo "└─────────────────────────────────────────────────┘"

# ── 3. Evaluate ───────────────────────────────────────────────────────────────
HEALTHY=true

# Use awk for float comparison (bash can't compare decimals natively)
if awk "BEGIN { exit !($ERROR_COUNT >= $ERROR_THRESHOLD) }"; then
  echo ""
  echo "❌ FAIL: Error count ($ERROR_COUNT) >= threshold ($ERROR_THRESHOLD)"
  HEALTHY=false
fi

if awk "BEGIN { exit !($P95_DURATION >= $DURATION_THRESHOLD_MS) }"; then
  echo ""
  echo "❌ FAIL: p95 Duration (${P95_DURATION}ms) >= threshold (${DURATION_THRESHOLD_MS}ms)"
  HEALTHY=false
fi

echo ""
if [ "$HEALTHY" = true ]; then
  echo "✅ Canary is HEALTHY — safe to complete cutover to Green"
  exit 0
else
  echo "🚨 Canary is UNHEALTHY — triggering rollback to Blue"
  exit 1
fi