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

EFFECTIVE_PLATFORM="${PLATFORM:-}"

# Choose bridge: web-browser.js for web, cdp-bridge.js for native
if [ "$EFFECTIVE_PLATFORM" = "web" ]; then
  BRIDGE="node scripts/agentic/web-browser.js"
else
  BRIDGE="node scripts/agentic/cdp-bridge.js"
fi

case "$COMMAND" in
  route)
    $BRIDGE get-route
    ;;
  state)
    $BRIDGE get-state
    ;;
  eval)
    $BRIDGE eval "$@"
    ;;
  can-go-back)
    $BRIDGE can-go-back
    ;;
  go-back)
    $BRIDGE go-back
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
    echo ""
    echo "Environment:"
    echo "  PLATFORM=web           Use web bridge instead of native CDP"
    exit 1
    ;;
esac
