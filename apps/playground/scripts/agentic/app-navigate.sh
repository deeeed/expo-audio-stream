#!/bin/bash
# Navigate the running app to a specific screen via CDP bridge.
# Returns JSON with previousRoute, currentRoute, deviceName, platform.
# Optionally takes a verification screenshot (--screenshot).
#
# Usage:
#   scripts/agentic/app-navigate.sh <route-path>
#   scripts/agentic/app-navigate.sh --screenshot <route-path>
#   scripts/agentic/app-navigate.sh --device "Pixel 6a" /(tabs)/record
#   scripts/agentic/app-navigate.sh /(tabs)/record
#   scripts/agentic/app-navigate.sh /minimal

set -euo pipefail

cd "$(dirname "$0")/../.."

# -- Parse flags -----------------------------------------------------------
TAKE_SCREENSHOT=false
DEVICE_FLAG=""
POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --screenshot) TAKE_SCREENSHOT=true; shift ;;
    --device)
      DEVICE_FLAG="--device $2"
      shift 2
      ;;
    *) POSITIONAL+=("$1"); shift ;;
  esac
done

ROUTE="${POSITIONAL[0]:-}"
if [ -z "$ROUTE" ]; then
  echo "Usage: app-navigate.sh [--screenshot] [--device <name>] <route-path>"
  echo ""
  echo "Options:"
  echo "  --screenshot           Take a verification screenshot after navigating"
  echo "  --device <name>        Target a specific device (substring match)"
  echo ""
  echo "Common routes:"
  echo "  /(tabs)/record            Record tab (default)"
  echo "  /(tabs)/import            Import audio files"
  echo "  /(tabs)/transcription     Transcription"
  echo "  /(tabs)/files             Recorded files"
  echo "  /(tabs)/more              More options"
  echo "  /minimal                  Minimal recording test"
  echo "  /trim                     Audio trimming"
  echo "  /decibel                  Decibel meter"
  echo "  /permissions              Permission settings"
  echo "  /audio-device-test        Audio device testing"
  exit 1
fi

# -- Navigate via unified CDP bridge ----------------------------------------
echo "Navigating to $ROUTE..."

# shellcheck disable=SC2086
RESULT=$(node scripts/agentic/cdp-bridge.mjs $DEVICE_FLAG navigate "$ROUTE" 2>&1)
echo "$RESULT"

# -- Optional screenshot (opt-in with --screenshot) ------------------------
if [ "$TAKE_SCREENSHOT" = true ]; then
  sleep 1
  # shellcheck disable=SC2086
  SCREENSHOT=$(scripts/agentic/screenshot.sh $DEVICE_FLAG "nav-${ROUTE//\//_}" 2>&1) || true
  if [ -n "$SCREENSHOT" ]; then
    echo "Screenshot: $SCREENSHOT"
  fi
fi
