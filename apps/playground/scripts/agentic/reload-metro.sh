#!/bin/bash
# Reload the JS bundle on connected device(s) via CDP Page.reload.
# Supports --device <name> flag for multi-device targeting.
cd "$(dirname "$0")/../.."
exec node scripts/agentic/cdp-bridge.mjs "$@" reload
