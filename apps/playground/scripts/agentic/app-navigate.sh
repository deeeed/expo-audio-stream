#!/bin/bash
# Navigate the running app to a specific screen via CDP bridge.
# Returns JSON with previousRoute, currentRoute, deviceName, platform.
# Optionally takes a verification screenshot (--screenshot).
#
# Usage:
#   scripts/agentic/app-navigate.sh <route-path>
#   scripts/agentic/app-navigate.sh --screenshot <route-path>
#   scripts/agentic/app-navigate.sh /(tabs)/record
#   scripts/agentic/app-navigate.sh /minimal
#   scripts/agentic/app-navigate.sh /(tabs)/agent-validation

set -euo pipefail

cd "$(dirname "$0")/../.."

# -- Parse flags -----------------------------------------------------------
TAKE_SCREENSHOT=false
POSITIONAL=()
for arg in "$@"; do
  case "$arg" in
    --screenshot) TAKE_SCREENSHOT=true ;;
    *) POSITIONAL+=("$arg") ;;
  esac
done

ROUTE="${POSITIONAL[0]:-}"
if [ -z "$ROUTE" ]; then
  echo "Usage: app-navigate.sh [--screenshot] <route-path>"
  echo ""
  echo "Options:"
  echo "  --screenshot           Take a verification screenshot after navigating"
  echo ""
  echo "Common routes:"
  echo "  /(tabs)/record            Record tab (default)"
  echo "  /(tabs)/import            Import audio files"
  echo "  /(tabs)/transcription     Transcription"
  echo "  /(tabs)/files             Recorded files"
  echo "  /(tabs)/more              More options"
  echo "  /(tabs)/agent-validation  Agent test page"
  echo "  /minimal                  Minimal recording test"
  echo "  /trim                     Audio trimming"
  echo "  /decibel                  Decibel meter"
  echo "  /permissions              Permission settings"
  echo "  /audio-device-test        Audio device testing"
  exit 1
fi

# -- Navigate via bridge (CDP for native, Playwright for web) ---------------
EFFECTIVE_PLATFORM="${PLATFORM:-}"
echo "Navigating to $ROUTE..."

if [ "$EFFECTIVE_PLATFORM" = "web" ]; then
  RESULT=$(node scripts/agentic/web-browser.js navigate "$ROUTE" 2>&1)
else
  RESULT=$(node scripts/agentic/cdp-bridge.js navigate "$ROUTE" 2>&1)
fi
echo "$RESULT"

# -- Optional screenshot (opt-in with --screenshot) ------------------------
if [ "$TAKE_SCREENSHOT" = true ]; then
  sleep 1

  # Detect platform from result to pass to screenshot.sh
  if [ "$EFFECTIVE_PLATFORM" = "web" ]; then
    PLATFORM_FLAG="web"
  else
    PLATFORM_FLAG=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('platform',''))" 2>/dev/null || echo "")
  fi

  if [ -n "$PLATFORM_FLAG" ]; then
    SCREENSHOT=$(scripts/agentic/screenshot.sh "nav-${ROUTE//\//_}" "$PLATFORM_FLAG" 2>&1) || true
  else
    SCREENSHOT=$(scripts/agentic/screenshot.sh "nav-${ROUTE//\//_}" 2>&1) || true
  fi

  if [ -n "$SCREENSHOT" ]; then
    echo "Screenshot: $SCREENSHOT"
  fi
fi
