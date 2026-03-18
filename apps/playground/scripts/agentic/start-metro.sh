#!/bin/bash
# Start Metro bundler — or attach to an already-running instance.
#
# Behavior:
#   1. Probe http://localhost:$PORT/status to detect a running Metro.
#   2. If running: print a message and exit 0 (caller can tail .agent/metro.log).
#   3. If not running: start Metro in background, tee to .agent/metro.log,
#      write PID to .agent/metro.pid, wait for the ready signal.
#
# Environment:
#   WATCHER_PORT   Metro port (default: 7365)

set -euo pipefail

cd "$(dirname "$0")/../.."

PORT="${WATCHER_PORT:-7365}"
LOGFILE=".agent/metro.log"
PIDFILE=".agent/metro.pid"
TIMEOUT=60

mkdir -p .agent

# Detect LAN IP (skip loopback, link-local, VPN)
LAN_IP=$(ifconfig | awk '/inet / && !/127\./ && !/169\.254\./ {print $2}' | grep -v '^::' | head -1)

print_launch_hint() {
  if [ -n "$LAN_IP" ]; then
    echo ""
    echo "To open the app on Android:"
    echo "  adb shell am start -a android.intent.action.VIEW -d \"exp+audioplayground://expo-development-client/?url=http://${LAN_IP}:${PORT}\" net.siteed.audioplayground.development/.MainActivity"
    echo ""
  fi
}

# --- Detect a running Metro via HTTP probe ---
if curl -sf "http://localhost:${PORT}/status" >/dev/null 2>&1; then
  echo "Metro already running on port $PORT."
  print_launch_hint
  # If we have a log file, show recent output so the caller has context
  if [ -s "$LOGFILE" ]; then
    echo "Recent logs from $LOGFILE:"
    tail -20 "$LOGFILE"
  fi
  exit 0
fi

# --- No Metro detected — start fresh ---
> "$LOGFILE"

echo "Starting Metro on port $PORT..."
EXPO_USE_METRO_WORKSPACE_ROOT=1 NODE_ENV=development yarn expo start --dev-client --port "$PORT" >> "$LOGFILE" 2>&1 &
METRO_PID=$!
echo "$METRO_PID" > "$PIDFILE"
echo "Metro PID: $METRO_PID, logging to $LOGFILE"

# Wait for ready signal
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  if grep -q "React Native DevTools" "$LOGFILE" 2>/dev/null; then
    echo "Metro ready after ${ELAPSED}s."
    print_launch_hint
    exit 0
  fi
  # Also check for Expo's ready signals
  if grep -q "Logs for your project" "$LOGFILE" 2>/dev/null; then
    echo "Metro ready after ${ELAPSED}s."
    print_launch_hint
    exit 0
  fi
  if ! kill -0 "$METRO_PID" 2>/dev/null; then
    echo "ERROR: Metro exited unexpectedly. Check $LOGFILE"
    rm -f "$PIDFILE"
    exit 1
  fi
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

echo "WARNING: Metro did not signal ready within ${TIMEOUT}s (PID $METRO_PID still running)."
echo "Check $LOGFILE for details."
exit 1
