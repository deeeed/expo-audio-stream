#!/bin/bash
# Navigate the running sherpa-voice app to a specific screen via CDP bridge.
# Returns JSON with previousRoute, currentRoute, deviceName, platform.
# Optionally takes a verification screenshot (--screenshot).
#
# Usage:
#   scripts/agentic/app-navigate.sh <route-path>
#   scripts/agentic/app-navigate.sh --screenshot <route-path>
#   scripts/agentic/app-navigate.sh --device "Pixel 6a" /(tabs)/home
#   scripts/agentic/app-navigate.sh /feature/asr
#   scripts/agentic/app-navigate.sh /feature/tts

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
  echo "  /(tabs)/home              Home / system info tab"
  echo "  /(tabs)/features          Features hub tab"
  echo "  /(tabs)/models            Model management tab"
  echo "  /feature/asr              Speech recognition"
  echo "  /feature/tts              Text-to-speech"
  echo "  /feature/audio-tagging    Audio tagging"
  echo "  /feature/speaker-id       Speaker identification"
  echo "  /feature/kws              Keyword spotting"
  exit 1
fi

# -- Navigate via unified CDP bridge ----------------------------------------
echo "Navigating to $ROUTE..."

# shellcheck disable=SC2086
RESULT=$(WATCHER_PORT=7500 node scripts/agentic/cdp-bridge.mjs $DEVICE_FLAG navigate "$ROUTE" 2>&1)
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
