#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
APP_ROOT="$(pwd)"
export APP_VARIANT="${APP_VARIANT:-development}"
exec bash "$(git rev-parse --show-toplevel)/scripts/agentic/preflight.sh" "$@"
