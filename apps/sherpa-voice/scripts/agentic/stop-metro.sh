#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
APP_ROOT="$(pwd)" exec bash "$(git rev-parse --show-toplevel)/scripts/agentic/stop-metro.sh" "$@"
