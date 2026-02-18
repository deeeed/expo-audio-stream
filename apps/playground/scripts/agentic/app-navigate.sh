#!/bin/bash
# Navigate the running app to a specific screen via CDP bridge.
# After navigating, takes a verification screenshot.
#
# Usage:
#   scripts/agentic/app-navigate.sh <route-path>
#   scripts/agentic/app-navigate.sh /(tabs)/record
#   scripts/agentic/app-navigate.sh /minimal
#   scripts/agentic/app-navigate.sh /(tabs)/agent-validation

set -euo pipefail

cd "$(dirname "$0")/../.."

ROUTE="${1:-}"
if [ -z "$ROUTE" ]; then
  echo "Usage: app-navigate.sh <route-path>"
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

# ── Navigate via CDP ────────────────────────────────────────────────────
echo "Navigating to $ROUTE..."
RESULT=$(node scripts/agentic/cdp-bridge.js navigate "$ROUTE" 2>&1)
echo "$RESULT"

# ── Wait for navigation to settle and take verification screenshot ──────
sleep 1

SCREENSHOT=$(scripts/agentic/screenshot.sh "nav-${ROUTE//\//_}" 2>&1) || true
if [ -n "$SCREENSHOT" ]; then
  echo "Screenshot: $SCREENSHOT"
fi
