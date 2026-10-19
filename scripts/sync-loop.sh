#!/bin/bash
# Local stand-in for the scheduled sync while a large photo backfill is running.
#
#   nohup caffeinate -i scripts/sync-loop.sh >/dev/null 2>&1 &
#
# Each pass is one normal `npm run sync:idx` (so: one process, sequential
# requests, ≤2 req/s, single-instance lock). A pass that stops at its media
# request budget is followed immediately by the next, which re-pulls listing
# data (keeping it under the 12h refresh rule) and resumes photos from the
# bucket manifest. Once the backfill is complete, passes repeat every 12h.
# Stop it with:  kill "$(cat .sync-loop.pid)"   (the current pass finishes its request and exits)
cd "$(dirname "$0")/.." || exit 1
LOG_DIR=".sync-logs"; mkdir -p "$LOG_DIR"
echo $$ > .sync-loop.pid
export MLSGRID_MEDIA_REQUEST_BUDGET="${MLSGRID_MEDIA_REQUEST_BUDGET:-40000}"
export NODE_OPTIONS="--max-old-space-size=8192"
failures=0
while true; do
  start=$(date +%s)
  log="$LOG_DIR/sync-$(date +%Y%m%d-%H%M%S).log"
  echo "[$(date)] pass starting → $log" >> "$LOG_DIR/loop.log"
  if npx tsx scripts/sync-idx.ts > "$log" 2>&1; then
    failures=0
    tail -6 "$log" >> "$LOG_DIR/loop.log"
    if grep -q "stopped early: request budget" "$log"; then
      continue                      # backfill still in progress
    fi
    elapsed=$(( $(date +%s) - start ))
    wait=$(( 12 * 3600 - elapsed )); [ "$wait" -lt 60 ] && wait=60
    echo "[$(date)] pass complete; next in ${wait}s" >> "$LOG_DIR/loop.log"
    sleep "$wait"
  else
    failures=$(( failures + 1 ))
    echo "[$(date)] pass FAILED ($failures): $(tail -2 "$log" | tr '\n' ' ')" >> "$LOG_DIR/loop.log"
    if [ "$failures" -ge 5 ]; then
      echo "[$(date)] 5 consecutive failures — stopping the loop" >> "$LOG_DIR/loop.log"
      exit 1
    fi
    sleep 900
  fi
done
