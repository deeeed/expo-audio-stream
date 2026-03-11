#!/bin/bash
# Query the running sherpa-onnx-demo app state via CDP bridge (port 7500).
#
# Usage:
#   scripts/agentic/app-state.sh route                    # Current route path
#   scripts/agentic/app-state.sh state                    # App model state
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
EXTRA_ARGS=("${POSITIONAL[@]:1}")

export WATCHER_PORT=7500
# shellcheck disable=SC2086
BRIDGE_CMD=(node scripts/agentic/cdp-bridge.mjs)
[[ -n "$DEVICE_FLAG" ]] && BRIDGE_CMD+=($DEVICE_FLAG)

case "$COMMAND" in
  route)
    "${BRIDGE_CMD[@]}" get-route
    ;;
  state)
    "${BRIDGE_CMD[@]}" get-state
    ;;
  eval)
    "${BRIDGE_CMD[@]}" eval "${EXTRA_ARGS[@]}"
    ;;
  can-go-back)
    "${BRIDGE_CMD[@]}" can-go-back
    ;;
  go-back)
    "${BRIDGE_CMD[@]}" go-back
    ;;
  press)
    "${BRIDGE_CMD[@]}" press-test-id "${EXTRA_ARGS[@]}"
    ;;
  scroll)
    "${BRIDGE_CMD[@]}" scroll-view "${EXTRA_ARGS[@]}"
    ;;
  *)
    echo "Usage: app-state.sh [--device <name>] <command> [args...]"
    echo ""
    echo "Commands:"
    echo "  route                          Current route path"
    echo "  state                          App model state"
    echo "  eval <expression>              Evaluate arbitrary JS in app context"
    echo "  can-go-back                    Check if navigation can go back"
    echo "  go-back                        Navigate back"
    echo "  press <testId>                 Press a component by testID"
    echo "  scroll [--test-id <id>] [--offset <n>] [--no-animated]"
    echo "                                 Scroll a ScrollView/FlatList by testID or globally"
    echo ""
    echo "Options:"
    echo "  --device <name>        Target a specific device (substring match)"
    exit 1
    ;;
esac
