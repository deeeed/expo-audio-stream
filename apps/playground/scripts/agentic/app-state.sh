#!/bin/bash
# Query the running app state via CDP bridge.
#
# Usage:
#   scripts/agentic/app-state.sh route                    # Current route path
#   scripts/agentic/app-state.sh state                    # Audio recorder state
#   scripts/agentic/app-state.sh eval "1+1"               # Arbitrary JS
#   scripts/agentic/app-state.sh can-go-back              # Can navigate back?
#   scripts/agentic/app-state.sh go-back                  # Navigate back
#   scripts/agentic/app-state.sh --device "Pixel 6a" state  # Target specific device

set -euo pipefail

cd "$(dirname "$0")/../.."

# -- Parse --device flag ---------------------------------------------------
DEVICE_FLAG=""
POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --device)
      DEVICE_FLAG="--device $2"
      shift 2
      ;;
    *) POSITIONAL+=("$1"); shift ;;
  esac
done

COMMAND="${POSITIONAL[0]:-route}"
# Remaining positional args after the command
EXTRA_ARGS=("${POSITIONAL[@]:1}")

# All platforms go through cdp-bridge.mjs (unified entry point)
# shellcheck disable=SC2086
BRIDGE="node scripts/agentic/cdp-bridge.mjs $DEVICE_FLAG"

case "$COMMAND" in
  route)
    $BRIDGE get-route
    ;;
  state)
    $BRIDGE get-state
    ;;
  eval)
    $BRIDGE eval "${EXTRA_ARGS[@]}"
    ;;
  can-go-back)
    $BRIDGE can-go-back
    ;;
  go-back)
    $BRIDGE go-back
    ;;
  *)
    echo "Usage: app-state.sh [--device <name>] <command> [args...]"
    echo ""
    echo "Commands:"
    echo "  route                  Current route path"
    echo "  state                  Audio recorder state (isRecording, isPaused, durationMs, etc.)"
    echo "  eval <expression>      Evaluate arbitrary JS in app context"
    echo "  can-go-back            Check if navigation can go back"
    echo "  go-back                Navigate back"
    echo ""
    echo "Options:"
    echo "  --device <name>        Target a specific device (substring match)"
    exit 1
    ;;
esac
