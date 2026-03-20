#!/bin/bash
# Launch the web version and run basic smoke tests.
#
# Usage: web-test.sh [label]
#
# Behavior:
#   1. Start expo web on PORT if not already running
#   2. Wait for the dev server to be ready
#   3. Take a screenshot using Playwright (if available) or curl-based check
#   4. Save screenshot to .agent/screenshots/

set -euo pipefail
APP_ROOT="${APP_ROOT:-$(pwd)}"
source "$(cd "$APP_ROOT" && git rev-parse --show-toplevel)/scripts/agentic/_lib.sh"
cd "$APP_ROOT"

LABEL="${1:-web-smoke}"
DIR=".agent/screenshots"
mkdir -p "$DIR"

check_web_server() {
  curl -sf "http://localhost:${PORT}" >/dev/null 2>&1
}

if ! check_web_server; then
  echo "Starting Expo web on port $PORT..."
  mkdir -p .agent
  yarn expo start --web --port "$PORT" 2>&1 | tee -a .agent/metro.log &
  WEB_PID=$!
  echo "$WEB_PID" > .agent/metro.pid

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

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
FILENAME="${TIMESTAMP}_${LABEL}.png"
FILEPATH="$DIR/$FILENAME"

if yarn dlx playwright --version &>/dev/null 2>&1; then
  echo "Taking web screenshot with Playwright..."

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

if [ ! -f "$FILEPATH" ] || [ ! -s "$FILEPATH" ]; then
  echo "Running basic HTTP smoke test..."
  HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:${PORT}" 2>/dev/null || echo "000")

  if [ "$HTTP_STATUS" = "200" ]; then
    echo "PASS: Web app responds with HTTP 200."
  else
    echo "FAIL: Web app returned HTTP $HTTP_STATUS."
    exit 1
  fi

  BODY=$(curl -sf "http://localhost:${PORT}" 2>/dev/null || echo "")
  if echo "$BODY" | grep -qi "expo\|audio\|react"; then
    echo "PASS: Response contains expected app content."
  else
    echo "WARNING: Response may not contain expected app content."
  fi

  echo "No screenshot taken (Playwright not available)."
  exit 0
fi

# shellcheck disable=SC2012
ls -t "$DIR"/*.png 2>/dev/null | tail -n +21 | xargs rm -f 2>/dev/null || true

ABSPATH="$(cd "$DIR" && pwd)/$FILENAME"
echo "Screenshot: $ABSPATH"
echo "PASS: Web smoke test completed."
