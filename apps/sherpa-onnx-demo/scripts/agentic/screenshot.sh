#!/bin/bash
# Take a screenshot via the unified CDP bridge (port 7500 for sherpa-onnx-demo).
#
# Usage:
#   scripts/agentic/screenshot.sh [--device <name>] [label]
#
# Output: prints JSON with { screenshot: <absolute-path>, deviceName, platform }

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
WATCHER_PORT=7500 node scripts/agentic/cdp-bridge.mjs $DEVICE_FLAG screenshot "$LABEL"
