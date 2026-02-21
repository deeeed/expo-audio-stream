#!/bin/bash
# Take a screenshot via the unified CDP bridge.
# Platform detection and device resolution happen inside cdp-bridge.mjs.
#
# Usage:
#   scripts/agentic/screenshot.sh [--device <name>] [label]
#
# Output: prints JSON with { screenshot: <absolute-path>, deviceName, platform }
#         When multiple devices are connected, broadcasts to all (or use --device).
#
# Keeps the last 20 screenshots (managed by cdp-bridge.mjs).

set -euo pipefail

cd "$(dirname "$0")/../.."

# -- Parse --device flag and positional args --------------------------------
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

LABEL="${POSITIONAL[0]:-screenshot}"

# shellcheck disable=SC2086
node scripts/agentic/cdp-bridge.mjs $DEVICE_FLAG screenshot "$LABEL"
