#!/bin/bash
# Reload the JS bundle on connected device(s) via CDP Page.reload.
# Supports --device <name> flag for multi-device targeting.
set -euo pipefail
APP_ROOT="${APP_ROOT:-$(pwd)}"
source "$(cd "$APP_ROOT" && git rev-parse --show-toplevel)/scripts/agentic/_lib.sh"
WATCHER_PORT="$PORT" exec node "${APP_ROOT}/scripts/agentic/cdp-bridge.mjs" "$@" reload
