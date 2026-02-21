#!/bin/bash
# device-cmd.sh — send a command to connected React Native devices.
#
# Usage:
#   scripts/agentic/device-cmd.sh [--device <name>] <command>
#
# Commands:
#   reload      — reload JS bundle on device(s)
#   debug       — open Hermes debugger / React Native DevTools
#   dev-menu    — open React Native developer menu
#
# --device <name>  case-insensitive substring match on deviceName (optional)

set -euo pipefail
cd "$(dirname "$0")/../.."

PORT="${WATCHER_PORT:-7365}"
DEVICE_FLAG=()

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --device) DEVICE_FLAG=(--device "$2"); shift 2 ;;
    *) CMD="$1"; shift ;;
  esac
done

case "${CMD:-}" in
  reload)
    node scripts/agentic/cdp-bridge.mjs "${DEVICE_FLAG[@]}" reload
    ;;

  debug|open-debugger)
    # Try Metro HTTP API first (Expo SDK 50+)
    if curl -sf -X POST "http://localhost:${PORT}/open-debugger" >/dev/null 2>&1; then
      echo '{"opened":true,"method":"metro-http"}'
    else
      # Fallback: trigger via CDP eval
      node scripts/agentic/cdp-bridge.mjs "${DEVICE_FLAG[@]}" eval \
        "NativeModules?.DevSettings?.openDebugger?.() ?? 'not supported'"
    fi
    ;;

  dev-menu|devmenu)
    # Try Metro HTTP API first
    if curl -sf -X POST "http://localhost:${PORT}/open-dev-menu" >/dev/null 2>&1; then
      echo '{"opened":true,"method":"metro-http"}'
    else
      # Fallback: platform-specific or CDP eval
      node scripts/agentic/cdp-bridge.mjs "${DEVICE_FLAG[@]}" eval \
        "NativeModules?.DevSettings?.show?.() ?? 'not supported'"
    fi
    ;;

  *)
    echo "Usage: device-cmd.sh [--device <name>] <reload|debug|dev-menu>"
    echo ""
    echo "Commands:"
    echo "  reload    Reload the JS bundle"
    echo "  debug     Open React Native debugger / Hermes DevTools"
    echo "  dev-menu  Open the React Native developer menu"
    exit 1
    ;;
esac
