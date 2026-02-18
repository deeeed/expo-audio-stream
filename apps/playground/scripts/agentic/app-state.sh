#!/bin/bash
# Query the running app state via CDP bridge.
#
# Usage:
#   scripts/agentic/app-state.sh route                    # Current route path
#   scripts/agentic/app-state.sh state                    # Audio recorder state
#   scripts/agentic/app-state.sh eval "1+1"               # Arbitrary JS
#   scripts/agentic/app-state.sh can-go-back              # Can navigate back?
#   scripts/agentic/app-state.sh go-back                  # Navigate back

set -euo pipefail

cd "$(dirname "$0")/../.."

COMMAND="${1:-route}"
shift || true

case "$COMMAND" in
  route)
    node scripts/agentic/cdp-bridge.js get-route
    ;;
  state)
    node scripts/agentic/cdp-bridge.js get-state
    ;;
  eval)
    node scripts/agentic/cdp-bridge.js eval "$@"
    ;;
  can-go-back)
    node scripts/agentic/cdp-bridge.js can-go-back
    ;;
  go-back)
    node scripts/agentic/cdp-bridge.js go-back
    ;;
  *)
    echo "Usage: app-state.sh <command> [args...]"
    echo ""
    echo "Commands:"
    echo "  route                  Current route path"
    echo "  state                  Audio recorder state (isRecording, isPaused, durationMs, etc.)"
    echo "  eval <expression>      Evaluate arbitrary JS in app context"
    echo "  can-go-back            Check if navigation can go back"
    echo "  go-back                Navigate back"
    exit 1
    ;;
esac
