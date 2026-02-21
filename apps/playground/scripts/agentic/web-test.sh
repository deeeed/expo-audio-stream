#!/bin/bash
# Launch the web version and run basic smoke tests.
#
# Usage: scripts/agentic/web-test.sh [label]
#
# Behavior:
#   1. Start expo web on WATCHER_PORT if not already running
#   2. Wait for the dev server to be ready
#   3. Take a screenshot using Playwright (if available) or curl-based check
#   4. Save screenshot to .agent/screenshots/
#
# Environment:
#   WATCHER_PORT   Dev server port (default: 7365)

set -euo pipefail

cd "$(dirname "$0")/../.."

PORT="${WATCHER_PORT:-7365}"
LABEL="${1:-web-smoke}"
DIR=".agent/screenshots"
mkdir -p "$DIR"

# ── Check if web server is running ─────────────────────────────────────
check_web_server() {
  curl -sf "http://localhost:${PORT}" >/dev/null 2>&1
}

# ── Start web server if needed ─────────────────────────────────────────
if ! check_web_server; then
  echo "Starting Expo web on port $PORT..."
  mkdir -p .agent
  npx expo start --web --port "$PORT" 2>&1 | tee -a .agent/metro.log &
  WEB_PID=$!
  echo "$WEB_PID" > .agent/metro.pid

  # Wait for server to be ready (up to 30s)
  ELAPSED=0
  while [ $ELAPSED -lt 30 ]; do
    if check_web_server; then
      echo "Web server ready after ${ELAPSED}s."
      break
    fi
    sleep 1
    ELAPSED=$((ELAPSED + 1))
  done

  if [ $ELAPSED -ge 30 ]; then
    echo "WARNING: Web server did not start within 30s."
    exit 1
  fi
else
  echo "Web server already running on port $PORT."
fi

# ── Run smoke test ─────────────────────────────────────────────────────
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
FILENAME="${TIMESTAMP}_${LABEL}.png"
FILEPATH="$DIR/$FILENAME"

# Try Playwright for screenshot if available
if command -v npx &>/dev/null && npx playwright --version &>/dev/null 2>&1; then
  echo "Taking web screenshot with Playwright..."

  # Create a temporary Playwright script
  TMPSCRIPT=$(mktemp /tmp/web-test-XXXXXX.js)
  cat > "$TMPSCRIPT" << 'PLAYWRIGHT_EOF'
const { chromium } = require('playwright');

(async () => {
  const port = process.env.WATCHER_PORT || '7365';
  const filepath = process.argv[2];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle', timeout: 15000 });
    const title = await page.title();
    console.log(`Page title: ${title}`);
    await page.screenshot({ path: filepath });
    console.log(`Screenshot saved: ${filepath}`);
  } catch (err) {
    console.error(`Playwright error: ${err.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
PLAYWRIGHT_EOF

  WATCHER_PORT="$PORT" node "$TMPSCRIPT" "$FILEPATH" 2>&1 || {
    echo "Playwright screenshot failed. Falling back to HTTP check."
    rm -f "$TMPSCRIPT"
  }
  rm -f "$TMPSCRIPT"
fi

# Fallback: basic HTTP smoke test if no screenshot was taken
if [ ! -f "$FILEPATH" ] || [ ! -s "$FILEPATH" ]; then
  echo "Running basic HTTP smoke test..."
  HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:${PORT}" 2>/dev/null || echo "000")

  if [ "$HTTP_STATUS" = "200" ]; then
    echo "PASS: Web app responds with HTTP 200."
  else
    echo "FAIL: Web app returned HTTP $HTTP_STATUS."
    exit 1
  fi

  # Check that the response contains expected content
  BODY=$(curl -sf "http://localhost:${PORT}" 2>/dev/null || echo "")
  if echo "$BODY" | grep -qi "expo\|audio\|react"; then
    echo "PASS: Response contains expected app content."
  else
    echo "WARNING: Response may not contain expected app content."
  fi

  echo "No screenshot taken (Playwright not available)."
  exit 0
fi

# ── Cleanup old screenshots (keep last 20) ──────────────────────────
# shellcheck disable=SC2012
ls -t "$DIR"/*.png 2>/dev/null | tail -n +21 | xargs rm -f 2>/dev/null || true

# ── Output ──────────────────────────────────────────────────────────
ABSPATH="$(cd "$DIR" && pwd)/$FILENAME"
echo "Screenshot: $ABSPATH"
echo "PASS: Web smoke test completed."
